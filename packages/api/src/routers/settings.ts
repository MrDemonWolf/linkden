import { router, protectedProcedure } from "../index";
import { db } from "@linkden/db";
import { siteSettings } from "@linkden/db/schema/index";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { stripHtml } from "../utils/sanitize";
import { upsertSetting } from "../utils/settings";
import { logAudit } from "../utils/audit";

// ─── Settings Router ───────────────────────────────────────────────────────
// Settings are key-value pairs stored in site_settings. The key whitelist below
// prevents arbitrary key injection — only known keys are accepted.
//
// Settings are grouped by category:
//   - Profile: profile_name, bio, avatar_url, verified_badge
//   - Appearance: theme_preset, theme, custom_*, banner_*, social_icon_shape
//   - SEO: seo_title, seo_description, seo_og_image, seo_og_mode, seo_og_template
//   - Branding: branding_enabled, branding_text, branding_link, branding_logo_url, etc.
//   - Features: wallet_pass_enabled, vcard_enabled, contact_form_enabled, mapkit_*
//   - Auth: magic_link_enabled, captcha_provider, captcha_site_key, captcha_secret_key
//   - Email: email_provider, email_api_key, email_from, contact_delivery
//   - System: default_color_mode, timezone, admin_branding_enabled
//
// Sanitization pipeline: values pass through sanitizeSetting() which applies
// type-appropriate validation — HTML stripping for text, URL validation,
// hex color format checks, and CSS injection mitigation.

// All valid setting keys — prevents arbitrary key injection
const VALID_SETTING_KEYS = [
	"profile_name",
	"bio",
	"avatar_url",
	"banner_preset",
	"banner_enabled",
	"banner_mode",
	"banner_custom_url",
	"theme_preset",
	"theme",
	"custom_primary",
	"custom_secondary",
	"custom_accent",
	"custom_background",
	"custom_css",
	"seo_title",
	"seo_description",
	"seo_og_image",
	"seo_og_mode",
	"seo_og_template",
	"branding_enabled",
	"branding_text",
	"branding_link",
	"branding_logo_url",
	"branding_favicon_url",
	"branding_site_name",
	"branding_pp_url",
	"branding_tos_url",
	"branding_pp_mode",
	"branding_pp_text",
	"branding_tos_mode",
	"branding_tos_text",
	"default_color_mode",
	"verified_badge",
	"wallet_pass_enabled",
	"vcard_enabled",
	"contact_form_enabled",
	"captcha_provider",
	"captcha_site_key",
	"captcha_secret_key",
	"social_icon_shape",
	"magic_link_enabled",
	"timezone",
	"email_provider",
	"email_api_key",
	"email_from",
	"admin_branding_enabled",
	"mapkit_enabled",
	"mapkit_token",
	"contact_delivery",
	"consent_banner_enabled",
	"consent_banner_text",
	"consent_privacy_url",
	"consent_categories",
] as const;

const settingKeySchema = z.enum(VALID_SETTING_KEYS);

// Keys containing secrets — masked in API responses, never exposed in plaintext
const SECRET_SETTING_KEYS = new Set(["email_api_key", "captcha_secret_key", "mapkit_token"]);

// Sanitization utilities
function isValidUrl(url: string): boolean {
	if (!url) return true;
	try {
		const parsed = new URL(url);
		return parsed.protocol === "http:" || parsed.protocol === "https:";
	} catch {
		return false;
	}
}

function isValidHexColor(color: string): boolean {
	return /^#[0-9A-Fa-f]{6}$/.test(color);
}

function sanitizeCss(css: string): string {
	// Strip known CSS injection vectors.
	// Note: regex-based CSS sanitization has inherent limitations.
	// Consider a proper CSS parser (e.g. csstree) for stricter validation in the future.
	return css
		.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
		.replace(/<[^>]*>/g, "")
		.replace(/expression\s*\(/gi, "")
		.replace(/url\s*\(\s*['"]?\s*javascript:/gi, "url(")
		.replace(/@import\b/gi, "/* @import blocked */")
		.replace(/url\s*\(\s*['"]?\s*data:/gi, "url(/* data: blocked */")
		.replace(/\\[0-9a-fA-F]{1,6}/g, "") // strip backslash escape sequences
		.replace(/behavior\s*:/gi, "")
		.replace(/-moz-binding\s*:/gi, "");
}

// Keys that should be sanitized as plain text (no HTML)
const TEXT_KEYS = ["profile_name", "bio", "branding_text", "seo_title", "seo_description", "seo_og_mode", "seo_og_template", "branding_site_name", "branding_pp_mode", "branding_tos_mode", "branding_pp_text", "branding_tos_text"];
// Keys that should be validated as URLs
const URL_KEYS = ["branding_link", "seo_og_image", "avatar_url", "banner_custom_url", "branding_logo_url", "branding_favicon_url", "branding_pp_url", "branding_tos_url"];
// Keys that should be validated as hex colors
const COLOR_KEYS = ["custom_primary", "custom_secondary", "custom_accent", "custom_background"];
// Keys with length limits
const LENGTH_LIMITS: Record<string, number> = {
	profile_name: 50,
	bio: 300,
	branding_text: 100,
	seo_title: 100,
	seo_description: 250,
	branding_site_name: 50,
};

function sanitizeSetting(key: string, value: string): string {
	if (TEXT_KEYS.includes(key)) {
		let sanitized = stripHtml(value);
		const limit = LENGTH_LIMITS[key];
		if (limit && sanitized.length > limit) {
			sanitized = sanitized.slice(0, limit);
		}
		return sanitized;
	}
	if (URL_KEYS.includes(key)) {
		if (value && !isValidUrl(value)) {
			throw new Error(`Invalid URL for ${key}`);
		}
		return value;
	}
	if (COLOR_KEYS.includes(key)) {
		if (value && !isValidHexColor(value)) {
			throw new Error(`Invalid color for ${key}: must be #RRGGBB`);
		}
		return value;
	}
	if (key === "custom_css") {
		return sanitizeCss(value);
	}
	// Timezone: validate against known IANA zones
	if (key === "timezone") {
		if (value === "") return value; // empty = browser default
		try {
			const supported = Intl.supportedValuesOf("timeZone");
			if (!supported.includes(value)) {
				throw new Error(`Invalid timezone: ${value}`);
			}
		} catch (e) {
			if (e instanceof Error && e.message.startsWith("Invalid timezone")) throw e;
			// Intl.supportedValuesOf not available — skip validation
		}
		return value;
	}
	// Email provider: enum check
	if (key === "email_provider") {
		const allowed = ["resend", "sendgrid", "mailgun", "smtp", "cloudflare", "none"];
		if (value && !allowed.includes(value)) {
			throw new Error(`Invalid email provider: ${value}`);
		}
		return value;
	}
	// Email from: basic email format
	if (key === "email_from") {
		if (value && !value.includes("@")) {
			throw new Error("Invalid email address for email_from");
		}
		return value;
	}
	// API keys / tokens: strip control chars, enforce length limit
	if (key === "email_api_key" || key === "mapkit_token") {
		const cleaned = value.replace(/[\x00-\x1f\x7f]/g, "");
		if (cleaned.length > 512) {
			return cleaned.slice(0, 512);
		}
		return cleaned;
	}
	// Boolean settings: coerce to "true"/"false"
	if (key === "admin_branding_enabled" || key === "mapkit_enabled") {
		return value === "true" ? "true" : "false";
	}
	// Contact delivery: validate allowed values
	if (key === "contact_delivery") {
		const allowed = ["email", "database", "both"];
		if (value && !allowed.includes(value)) {
			return "database";
		}
		return value;
	}
	return value;
}

export const settingsRouter = router({
	get: protectedProcedure
		.input(z.object({ key: settingKeySchema }))
		.query(async ({ input }) => {
			const [result] = await db
				.select()
				.from(siteSettings)
				.where(eq(siteSettings.key, input.key));
			if (!result) return null;
			if (SECRET_SETTING_KEYS.has(result.key) && result.value) {
				return { ...result, value: "••••••" };
			}
			return result;
		}),

	getAll: protectedProcedure.query(async () => {
		const results = await db.select().from(siteSettings);
		const map: Record<string, string> = {};
		for (const row of results) {
			map[row.key] = SECRET_SETTING_KEYS.has(row.key) && row.value
				? "••••••"
				: row.value;
		}
		return map;
	}),

	update: protectedProcedure
		.input(
			z.object({
				key: settingKeySchema,
				value: z.string(),
			}),
		)
		.mutation(async ({ input }) => {
			if (SECRET_SETTING_KEYS.has(input.key) && input.value === "••••••") {
				return { success: true };
			}
			const sanitizedValue = sanitizeSetting(input.key, input.value);
			await upsertSetting(input.key, sanitizedValue);
		await logAudit("settings.update", "setting", input.key);

			return { success: true };
		}),

	updateBulk: protectedProcedure
		.input(z.array(z.object({ key: settingKeySchema, value: z.string() })))
		.mutation(async ({ input }) => {
			for (const { key, value } of input) {
				if (SECRET_SETTING_KEYS.has(key) && value === "••••••") {
					continue;
				}
				const sanitizedValue = sanitizeSetting(key, value);
				await upsertSetting(key, sanitizedValue);
			}
		await logAudit("settings.updateBulk", "setting");

			return { success: true };
		}),
});

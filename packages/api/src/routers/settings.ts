import { router, protectedProcedure } from "../index";
import { db } from "@linkden/db";
import { siteSettings } from "@linkden/db/schema/index";
import { eq } from "drizzle-orm";
import { z } from "zod";

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
] as const;

const settingKeySchema = z.enum(VALID_SETTING_KEYS);

// Sanitization utilities
function stripHtmlTags(str: string): string {
	return str.replace(/<[^>]*>/g, "");
}

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
		let sanitized = stripHtmlTags(value);
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
			return result ?? null;
		}),

	getAll: protectedProcedure.query(async () => {
		const results = await db.select().from(siteSettings);
		const map: Record<string, string> = {};
		for (const row of results) {
			map[row.key] = row.value;
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
			const sanitizedValue = sanitizeSetting(input.key, input.value);
			const [existing] = await db
				.select()
				.from(siteSettings)
				.where(eq(siteSettings.key, input.key));

			if (existing) {
				await db
					.update(siteSettings)
					.set({ value: sanitizedValue })
					.where(eq(siteSettings.key, input.key));
			} else {
				await db.insert(siteSettings).values({
					key: input.key,
					value: sanitizedValue,
				});
			}

			return { success: true };
		}),

	updateBulk: protectedProcedure
		.input(z.array(z.object({ key: settingKeySchema, value: z.string() })))
		.mutation(async ({ input }) => {
			for (const { key, value } of input) {
				const sanitizedValue = sanitizeSetting(key, value);
				const [existing] = await db
					.select()
					.from(siteSettings)
					.where(eq(siteSettings.key, key));

				if (existing) {
					await db
						.update(siteSettings)
						.set({ value: sanitizedValue })
						.where(eq(siteSettings.key, key));
				} else {
					await db.insert(siteSettings).values({ key, value: sanitizedValue });
				}
			}

			return { success: true };
		}),
});

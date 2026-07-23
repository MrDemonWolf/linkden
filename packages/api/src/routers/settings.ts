import { router, protectedProcedure } from "../index";
import { db } from "@linkden/db";
import { siteSettings } from "@linkden/db/schema/index";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { sanitizeUrl, stripHtml } from "../utils/sanitize";
import { runBatch, settingUpsertStmt, upsertSetting } from "../utils/settings";
import { logAudit } from "../utils/audit";
import { settingKeySchema, VALID_SETTING_KEYS } from "@linkden/validators/settings";
import {
	getSettingMeta,
	isSecretKey,
	maskSecret,
	MAX_SETTING_VALUE_LENGTH,
	SECRET_MASK,
} from "@linkden/validators/settings-registry";

// ─── Settings Router ───────────────────────────────────────────────────────
// Settings are key-value pairs stored in site_settings. The key whitelist
// (settingKeySchema) prevents arbitrary key injection. Per-key metadata —
// sanitizer kind, max length, secret/mask/backup policy — lives in the shared
// settings registry (@linkden/validators/settings-registry), so the settings,
// wallet, and backup routers all agree on one source of truth.

// Empty values are allowed; non-empty values must be http(s) URLs.
function isValidUrl(url: string): boolean {
	if (!url) return true;
	return sanitizeUrl(url) !== "";
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

function sanitizeSetting(key: string, value: string): string {
	const meta = getSettingMeta(key);
	switch (meta?.kind) {
		case "text": {
			let sanitized = stripHtml(value);
			if (meta.maxLength && sanitized.length > meta.maxLength) {
				sanitized = sanitized.slice(0, meta.maxLength);
			}
			return sanitized;
		}
		case "url":
			if (value && !isValidUrl(value)) throw new Error(`Invalid URL for ${key}`);
			return value;
		case "color":
			if (value && !isValidHexColor(value)) {
				throw new Error(`Invalid color for ${key}: must be #RRGGBB`);
			}
			return value;
		case "css":
			return sanitizeCss(value);
		case "timezone": {
			if (value === "") return value; // empty = browser default
			try {
				const supported = Intl.supportedValuesOf("timeZone");
				if (!supported.includes(value)) throw new Error(`Invalid timezone: ${value}`);
			} catch (e) {
				if (e instanceof Error && e.message.startsWith("Invalid timezone")) throw e;
				// Intl.supportedValuesOf not available — skip validation
			}
			return value;
		}
		case "emailProvider": {
			const allowed = ["resend", "sendgrid", "mailgun", "smtp", "cloudflare", "none"];
			if (value && !allowed.includes(value)) throw new Error(`Invalid email provider: ${value}`);
			return value;
		}
		case "emailFrom":
			if (value && !value.includes("@")) throw new Error("Invalid email address for email_from");
			return value;
		case "apiKey": {
			// biome-ignore lint/suspicious/noControlCharactersInRegex: intentionally strips control characters
			const cleaned = value.replace(/[\x00-\x1f\x7f]/g, "");
			const cap = meta.maxLength ?? 512;
			return cleaned.length > cap ? cleaned.slice(0, cap) : cleaned;
		}
		case "boolean":
			return value === "true" ? "true" : "false";
		case "contactDelivery": {
			const allowed = ["email", "database", "both"];
			return value && !allowed.includes(value) ? "database" : value;
		}
		default:
			return value;
	}
}

export const settingsRouter = router({
	get: protectedProcedure.input(z.object({ key: settingKeySchema })).query(async ({ input }) => {
		const [result] = await db.select().from(siteSettings).where(eq(siteSettings.key, input.key));
		if (!result) return null;
		return { ...result, value: maskSecret(result.key, result.value) };
	}),

	getAll: protectedProcedure.query(async () => {
		const results = await db.select().from(siteSettings);
		const map: Record<string, string> = {};
		for (const row of results) {
			map[row.key] = maskSecret(row.key, row.value);
		}
		return map;
	}),

	update: protectedProcedure
		.input(z.object({ key: settingKeySchema, value: z.string().max(MAX_SETTING_VALUE_LENGTH) }))
		.mutation(async ({ input }) => {
			// Ignore a re-submitted mask — the real secret is already stored.
			if (isSecretKey(input.key) && input.value === SECRET_MASK) {
				return { success: true };
			}
			const sanitizedValue = sanitizeSetting(input.key, input.value);
			await upsertSetting(input.key, sanitizedValue);
			await logAudit("settings.update", "setting", input.key);

			return { success: true };
		}),

	updateBulk: protectedProcedure
		.input(
			z
				.array(z.object({ key: settingKeySchema, value: z.string().max(MAX_SETTING_VALUE_LENGTH) }))
				.max(VALID_SETTING_KEYS.length),
		)
		.mutation(async ({ input }) => {
			const stmts = input
				.filter(({ key, value }) => !(isSecretKey(key) && value === SECRET_MASK))
				.map(({ key, value }) => settingUpsertStmt(key, sanitizeSetting(key, value)));
			await runBatch(stmts);
			await logAudit("settings.updateBulk", "setting");

			return { success: true };
		}),
});

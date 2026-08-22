import { db } from "@linkden/db";
import { siteSettings } from "@linkden/db/schema/index";
import { settingKeySchema, VALID_SETTING_KEYS } from "@linkden/validators/settings";
import {
	getSettingMeta,
	isSecretKey,
	MAX_SETTING_VALUE_LENGTH,
	maskSecret,
	SECRET_MASK,
} from "@linkden/validators/settings-registry";
import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { protectedProcedure, router } from "../index";
import { logAudit } from "../utils/audit";
import { sanitizeUrl, stripHtml } from "../utils/sanitize";
import { runBatch, settingUpsertStmt, upsertSetting } from "../utils/settings";

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

const bad = (message: string) => new TRPCError({ code: "BAD_REQUEST", message });

// Exported so backup.import runs the same whitelist + sanitization pipeline
// instead of raw upserts. Per-key behavior comes from the settings registry;
// invalid values throw BAD_REQUEST (backup.import catches and skips them).
export function sanitizeSetting(key: string, value: string): string {
	const meta = getSettingMeta(key);
	if (!meta) throw bad(`Unknown setting: ${key}`);
	// text/apiKey clamp to maxLength; every other bounded kind rejects overflow.
	const clamps = meta.kind === "text" || meta.kind === "apiKey";
	if (meta.maxLength && !clamps && value.length > meta.maxLength) {
		throw bad(`${key} exceeds ${meta.maxLength} characters`);
	}
	switch (meta.kind) {
		case "text":
			return stripHtml(value).slice(0, meta.maxLength ?? MAX_SETTING_VALUE_LENGTH);
		case "url":
			if (value && (value.length > 2048 || !isValidUrl(value))) throw bad(`Invalid URL for ${key}`);
			return value;
		case "color":
			if (value && !isValidHexColor(value)) throw bad(`Invalid color for ${key}: must be #RRGGBB`);
			return value;
		case "css":
			return sanitizeCss(value);
		case "timezone": {
			if (value === "") return value; // empty = browser default
			let supported: string[] | undefined;
			try {
				supported = Intl.supportedValuesOf("timeZone");
			} catch {
				// Intl.supportedValuesOf not available — skip validation
			}
			if (supported && !supported.includes(value)) throw bad(`Invalid timezone: ${value}`);
			return value;
		}
		case "emailFrom":
			if (value && !value.includes("@")) throw bad("Invalid email address for email_from");
			return value;
		case "apiKey":
			// biome-ignore lint/suspicious/noControlCharactersInRegex: intentionally strips control characters
			return value.replace(/[\x00-\x1f\x7f]/g, "").slice(0, meta.maxLength ?? 512);
		case "boolean":
			if (value !== "true" && value !== "false") throw bad(`${key} must be "true" or "false"`);
			return value;
		case "enum":
			if (value && !meta.values.includes(value)) throw bad(`Invalid value for ${key}: ${value}`);
			return value;
		case "opaque":
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

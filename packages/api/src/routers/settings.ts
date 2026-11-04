import { db } from "@linkden/db";
import { siteSettings, user } from "@linkden/db/schema/index";
import { UPLOADED_IMAGE_PATH } from "@linkden/validators/primitives";
import { settingKeySchema, VALID_SETTING_KEYS } from "@linkden/validators/settings";
import {
	getSettingMeta,
	isSecretKey,
	MAX_SETTING_VALUE_LENGTH,
	maskSecret,
	SECRET_MASK,
	type SettingMeta,
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

// Empty values are allowed; non-empty values must be http(s) URLs or an
// uploaded image's origin-relative path (what POST /api/upload returns).
function isValidUrl(url: string): boolean {
	if (!url) return true;
	return UPLOADED_IMAGE_PATH.test(url) || sanitizeUrl(url) !== "";
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

/**
 * Magic link can't be turned on without an email provider (links are sent by
 * email) or while 2FA is on (a link would skip the second factor). The auth
 * hooks refuse to send in both states anyway; this rejects the setting itself
 * so the admin isn't shown a switch that silently does nothing.
 * `entries` are the values being written in this request (secrets unmasked).
 */
async function assertMagicLinkAllowed(entries: ReadonlyArray<{ key: string; value: string }>) {
	if (!entries.some(({ key, value }) => key === "magic_link_enabled" && value === "true")) return;
	const sentKey = entries.find(({ key }) => key === "email_api_key")?.value;
	let emailConfigured = !!sentKey && sentKey !== SECRET_MASK;
	if (!emailConfigured && sentKey !== "") {
		const [row] = await db
			.select({ value: siteSettings.value })
			.from(siteSettings)
			.where(eq(siteSettings.key, "email_api_key"));
		emailConfigured = !!row?.value;
	}
	if (!emailConfigured) throw bad("Set up an email provider first: magic links are sent by email");
	const [admin] = await db.select({ twoFactorEnabled: user.twoFactorEnabled }).from(user).limit(1);
	if (admin?.twoFactorEnabled) {
		throw bad("Magic links can't be used while two-factor authentication is on");
	}
}

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
		case "timezone":
			if (value === "") return value; // empty = UTC (analytics buckets unset as UTC)
			// Validate by construction, not list membership: on workerd/V8,
			// Intl.supportedValuesOf only lists ICU canonical ids and leaves out
			// UTC, Asia/Kolkata, Europe/Kyiv, … which the formatter accepts.
			try {
				new Intl.DateTimeFormat("en-US", { timeZone: value });
			} catch {
				throw bad(`Invalid timezone: ${value}`);
			}
			return value;
		case "emailFrom":
			if (value && !value.includes("@")) throw bad("Invalid email address for email_from");
			return value;
		case "apiKey":
			// No real key contains the mask character: a mask glued to a pasted
			// key (from any client, or a backup) must never be stored.
			if (value.includes(SECRET_MASK[0] as string)) throw bad(`Invalid value for ${key}`);
			// biome-ignore lint/suspicious/noControlCharactersInRegex: intentionally strips control characters
			return value.replace(/[\x00-\x1f\x7f]/g, "").slice(0, meta.maxLength ?? 512);
		case "boolean":
			if (value !== "true" && value !== "false") throw bad(`${key} must be "true" or "false"`);
			return value;
		case "enum":
			if (value && !meta.values.includes(value)) throw bad(`Invalid value for ${key}: ${value}`);
			return value;
		case "opaque":
			if (meta.validate && !meta.validate(value)) throw bad(`Invalid value for ${key}`);
			return value;
		default: {
			const unhandled: never = meta;
			throw bad(`Unknown setting: ${key} (${(unhandled as SettingMeta).kind})`);
		}
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
			await assertMagicLinkAllowed([{ key: input.key, value: sanitizedValue }]);
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
			const entries = input
				.filter(({ key, value }) => !(isSecretKey(key) && value === SECRET_MASK))
				.map(({ key, value }) => ({ key, value: sanitizeSetting(key, value) }));
			await assertMagicLinkAllowed(entries);
			const stmts = entries.map(({ key, value }) => settingUpsertStmt(key, value));
			await runBatch(stmts);
			await logAudit("settings.updateBulk", "setting");

			return { success: true };
		}),
});

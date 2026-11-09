import {
	getSettingMeta,
	MAX_SETTING_VALUE_LENGTH,
	SECRET_MASK,
	type SettingMeta,
} from "@linkden/validators/settings-registry";
import { TRPCError } from "@trpc/server";
import { sanitizeUrl, stripHtml } from "./sanitize";

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

/** Shared registry gate for settings, wallet, vCard and backup writes. */
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

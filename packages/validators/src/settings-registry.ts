// ─── Canonical settings registry ────────────────────────────────────────────
// One source of truth for every site_settings key: its sanitizer kind, max
// length, allowed enum values, whether it is a secret (masked in responses,
// excluded from backups), and whether it belongs to the wallet config surface.
// Consumers (settings / wallet / backup routers) derive secret sets, masking,
// backup policy, and the key whitelist from here instead of maintaining their
// own drifting copies.

import type { z } from "zod";
import { consentCategoriesSchema } from "./consent-schema";
import { vcardDataSchema } from "./vcard";
import {
	isCertificateMaterial,
	isPrivateKeyMaterial,
	PASS_TEMPLATE_PRESETS,
	passFieldsSchemaFor,
	passLocationsSchema,
	relevantDateSchema,
} from "./wallet";

export type SettingKind =
	| "text" // HTML-stripped, length-clamped
	| "url" // must be http(s) if non-empty
	| "color" // #RRGGBB if non-empty
	| "css" // custom CSS sanitizer
	| "timezone" // IANA zone
	| "emailFrom" // must contain @
	| "apiKey" // control chars stripped, capped
	| "boolean" // exactly "true" or "false"
	| "enum" // one of `values` (empty string = unset)
	| "opaque"; // stored verbatim, length-capped, structurally checked by `validate`

interface BaseMeta {
	/** Max character length; every non-enum/boolean/color/url key declares one. */
	maxLength?: number;
	/** Secret: masked in API responses and never written to a backup. */
	secret?: boolean;
	/** Part of the wallet config surface (managed by the wallet router). */
	wallet?: boolean;
	/**
	 * Structural check for an `opaque` value (JSON shape, ISO date, PEM). Run by
	 * sanitizeSetting, so settings.update, the wallet/vcard routers and
	 * backup.import share one gate instead of trusting the value's "owner".
	 */
	validate?: (value: string) => boolean;
}

export type SettingMeta = BaseMeta &
	({ kind: Exclude<SettingKind, "enum"> } | { kind: "enum"; values: readonly string[] });

/** Hard cap on any single stored value (bytes ≈ chars); rejects abuse. */
export const MAX_SETTING_VALUE_LENGTH = 100_000;

/** Legal / long-form text (privacy policy, terms). */
const LONG_TEXT = 20_000;
/** Short mode / preset identifiers. */
const SHORT = 40;

/** The mask shown in place of a secret value. */
export const SECRET_MASK = "••••••";

// ─── Enum value lists ───────────────────────────────────────────────────────
// Lists that mirror a UI catalogue carry a parity test in
// __tests__/settings-registry.test.ts so they can't drift from the source.

/** Mirrors `themePresets[].name` in packages/ui/src/themes.ts. */
export const THEME_PRESET_NAMES = [
	"default",
	"dark",
	"ocean-blue",
	"sunset",
	"forest",
	"minimal",
	"corporate-classic",
	"blood-moon",
	"hacker-terminal",
	"hellfire",
	"abyssal",
] as const;

/**
 * A free-form theme name (e.g. a LinkStack theme) as a LinkDen preset name:
 * trimmed, lower-cased, spaces/underscores → hyphens. Null when it matches no
 * preset, so callers never write a value nothing reads.
 */
export function themePresetFromName(name: string | null | undefined): string | null {
	if (!name) return null;
	const normalized = name
		.trim()
		.toLowerCase()
		.replace(/[\s_]+/g, "-");
	return (THEME_PRESET_NAMES as readonly string[]).includes(normalized) ? normalized : null;
}

/**
 * Mirrors `bannerPresets[].id` in packages/ui/src/banner-presets.ts, plus the
 * legacy ids that `getPresetById` remaps (kept so old backups still import).
 */
export const BANNER_PRESET_IDS = [
	"midnight",
	"carbon-fiber",
	"grain-dark",
	"ember-glow",
	"wolf-shadow",
	"void-rift",
	"theme-gradient",
	"theme-mesh",
	"theme-radial",
	"theme-fade",
	"shader-mesh-gradient",
	"shader-neuro-noise",
	"shader-waves",
	"shader-grain-gradient",
	"shader-swirl",
	// legacy
	"theme-drift",
	"cyber-drift",
] as const;

/** Mirrors `OG_TEMPLATES[].id` in apps/web/src/lib/og-templates.ts. */
export const OG_TEMPLATE_IDS = ["minimal", "gradient", "bold", "profile"] as const;

export const SOCIAL_ICON_SHAPES = ["circle", "rounded-square"] as const;
export const COLOR_MODES = ["light", "dark", "system"] as const;
export const OG_MODES = ["template", "custom"] as const;
export const BANNER_MODES = ["preset", "custom"] as const;
export const LEGAL_DOC_MODES = ["url", "text"] as const;
export const LOGIN_BG_MODES = ["default", "preset", "custom"] as const;
/** Allowed CAPTCHA providers (empty string = unset). */
export const CAPTCHA_PROVIDERS = ["none", "turnstile", "recaptcha", "hcaptcha"] as const;
export const EMAIL_PROVIDERS = [
	"resend",
	"sendgrid",
	"mailgun",
	"smtp",
	"cloudflare",
	"none",
] as const;
export const CONTACT_DELIVERY_MODES = ["email", "database", "both"] as const;

/**
 * BCP-47 language tag shape for `site_language` (e.g. "en", "pt-BR",
 * "zh-Hant-TW"). Mirrored by LANG_TAG in apps/web public-page.tsx, which can't
 * import this zod-bearing module into the public bundle.
 */
export const SITE_LANGUAGE_PATTERN = /^[A-Za-z]{2,3}(?:-[A-Za-z0-9]{2,8}){0,3}$/;
/** True when `value` is JSON that `schema` accepts. */
const jsonMatching =
	(schema: z.ZodType) =>
	(value: string): boolean => {
		try {
			return schema.safeParse(JSON.parse(value)).success;
		} catch {
			return false;
		}
	};

/** Signing material: "" clears it; anything else must be loadable by the signer. */
const certificateOrBlank = (v: string) => v === "" || isCertificateMaterial(v);
const privateKeyOrBlank = (v: string) => v === "" || isPrivateKeyMaterial(v);

const enumOf = (values: readonly string[], extra: BaseMeta = {}): SettingMeta => ({
	kind: "enum",
	values,
	...extra,
});

export const SETTING_REGISTRY: Record<string, SettingMeta> = {
	// Profile
	profile_name: { kind: "text", maxLength: 50 },
	bio: { kind: "text", maxLength: 300 },
	avatar_url: { kind: "url" },
	verified_badge: { kind: "boolean" },
	// Banner
	banner_preset: enumOf(BANNER_PRESET_IDS),
	banner_enabled: { kind: "boolean" },
	banner_mode: enumOf(BANNER_MODES),
	banner_custom_url: { kind: "url" },
	// Appearance
	theme_preset: enumOf(THEME_PRESET_NAMES),
	/** LinkStack-import theme JSON; parsed leniently by public.getProfile. */
	theme: { kind: "opaque", maxLength: 2_000 },
	custom_primary: { kind: "color" },
	custom_secondary: { kind: "color" },
	custom_accent: { kind: "color" },
	custom_background: { kind: "color" },
	custom_css: { kind: "css", maxLength: LONG_TEXT },
	social_icon_shape: enumOf(SOCIAL_ICON_SHAPES),
	default_color_mode: enumOf(COLOR_MODES),
	// SEO
	seo_title: { kind: "text", maxLength: 100 },
	seo_description: { kind: "text", maxLength: 250 },
	seo_og_image: { kind: "url" },
	seo_og_mode: enumOf(OG_MODES),
	seo_og_template: enumOf(OG_TEMPLATE_IDS),
	/** Public page `lang` (BCP-47); empty = English. */
	site_language: {
		kind: "opaque",
		maxLength: 35,
		validate: (v) => v === "" || SITE_LANGUAGE_PATTERN.test(v),
	},
	// Branding
	branding_enabled: { kind: "boolean" },
	branding_text: { kind: "text", maxLength: 100 },
	branding_link: { kind: "url" },
	branding_logo_url: { kind: "url" },
	branding_login_logo_url: { kind: "url" },
	branding_login_bg_mode: enumOf(LOGIN_BG_MODES),
	branding_login_bg_preset: enumOf(BANNER_PRESET_IDS),
	branding_login_bg_custom_url: { kind: "url" },
	branding_favicon_url: { kind: "url" },
	branding_site_name: { kind: "text", maxLength: 50 },
	branding_pp_url: { kind: "url" },
	branding_tos_url: { kind: "url" },
	branding_pp_mode: enumOf(LEGAL_DOC_MODES),
	branding_pp_text: { kind: "text", maxLength: LONG_TEXT },
	branding_tos_mode: enumOf(LEGAL_DOC_MODES),
	branding_tos_text: { kind: "text", maxLength: LONG_TEXT },
	// Features
	wallet_pass_enabled: { kind: "boolean", wallet: true },
	vcard_enabled: { kind: "boolean" },
	/**
	 * JSON blob written by the vcard router. vcardDataSchema bounds the content;
	 * the cap is the global one because JSON escaping of a schema-valid record
	 * (20 URLs of 2048 chars) can exceed any tighter fixed limit.
	 */
	vcard_data: {
		kind: "opaque",
		maxLength: MAX_SETTING_VALUE_LENGTH,
		validate: jsonMatching(vcardDataSchema),
	},
	contact_form_enabled: { kind: "boolean" },
	// Auth / CAPTCHA
	captcha_provider: enumOf(CAPTCHA_PROVIDERS),
	captcha_site_key: { kind: "text", maxLength: 512 },
	captcha_secret_key: { kind: "apiKey", maxLength: 512, secret: true },
	magic_link_enabled: { kind: "boolean" },
	// Email
	email_provider: enumOf(EMAIL_PROVIDERS),
	email_api_key: { kind: "apiKey", maxLength: 512, secret: true },
	email_from: { kind: "emailFrom", maxLength: 254 },
	contact_delivery: enumOf(CONTACT_DELIVERY_MODES),
	// System
	timezone: { kind: "timezone", maxLength: 64 },
	admin_branding_enabled: { kind: "boolean" },
	mapkit_enabled: { kind: "boolean" },
	mapkit_token: { kind: "apiKey", maxLength: 512, secret: true },
	// Consent
	consent_banner_enabled: { kind: "boolean" },
	consent_banner_text: { kind: "text", maxLength: 500 },
	consent_privacy_url: { kind: "url" },
	/** JSON `{ analytics, marketing, functional }` flags. */
	consent_categories: {
		kind: "opaque",
		maxLength: 500,
		validate: jsonMatching(consentCategoriesSchema),
	},
	// Wallet (written by the wallet router through sanitizeSetting)
	wallet_show_email: { kind: "boolean", wallet: true },
	wallet_show_name: { kind: "boolean", wallet: true },
	wallet_show_qr_code: { kind: "boolean", wallet: true },
	wallet_template_preset: enumOf(PASS_TEMPLATE_PRESETS, { wallet: true }),
	wallet_organization_name: { kind: "text", maxLength: 100, wallet: true },
	wallet_pass_description: { kind: "text", maxLength: 200, wallet: true },
	wallet_background_color: { kind: "color", wallet: true },
	wallet_foreground_color: { kind: "color", wallet: true },
	wallet_label_color: { kind: "color", wallet: true },
	wallet_logo_url: { kind: "url", wallet: true },
	wallet_icon_url: { kind: "url", wallet: true },
	wallet_thumbnail_url: { kind: "url", wallet: true },
	wallet_strip_url: { kind: "url", wallet: true },
	// Field caps leave room for JSON escaping of schema-valid fields (≈1.9k per
	// worst-case field; 20 back fields).
	wallet_header_fields: {
		kind: "opaque",
		maxLength: 10_000,
		wallet: true,
		validate: jsonMatching(passFieldsSchemaFor("header")),
	},
	wallet_primary_fields: {
		kind: "opaque",
		maxLength: 10_000,
		wallet: true,
		validate: jsonMatching(passFieldsSchemaFor("primary")),
	},
	wallet_secondary_fields: {
		kind: "opaque",
		maxLength: 10_000,
		wallet: true,
		validate: jsonMatching(passFieldsSchemaFor("secondary")),
	},
	wallet_auxiliary_fields: {
		kind: "opaque",
		maxLength: 10_000,
		wallet: true,
		validate: jsonMatching(passFieldsSchemaFor("auxiliary")),
	},
	wallet_back_fields: {
		kind: "opaque",
		maxLength: 40_000,
		wallet: true,
		validate: jsonMatching(passFieldsSchemaFor("back")),
	},
	wallet_relevant_date: {
		kind: "opaque",
		maxLength: SHORT,
		wallet: true,
		validate: (v) => relevantDateSchema.safeParse(v).success,
	},
	wallet_locations: {
		kind: "opaque",
		maxLength: 10_000,
		wallet: true,
		validate: jsonMatching(passLocationsSchema),
	},
	wallet_signer_cert: {
		kind: "opaque",
		maxLength: LONG_TEXT,
		wallet: true,
		secret: true,
		validate: certificateOrBlank,
	},
	wallet_signer_key: {
		kind: "opaque",
		maxLength: LONG_TEXT,
		wallet: true,
		secret: true,
		validate: privateKeyOrBlank,
	},
	wallet_wwdr_cert: {
		kind: "opaque",
		maxLength: LONG_TEXT,
		wallet: true,
		secret: true,
		validate: certificateOrBlank,
	},
	wallet_team_id: { kind: "opaque", maxLength: 20, wallet: true },
	wallet_pass_type_id: { kind: "opaque", maxLength: 100, wallet: true },
} as const satisfies Record<string, SettingMeta>;

const ALL_KEYS = Object.keys(SETTING_REGISTRY);

/** Keys that belong to the wallet config surface. */
export const WALLET_SETTING_KEYS = ALL_KEYS.filter((k) => SETTING_REGISTRY[k]?.wallet);

/** Secret keys — masked in responses and excluded from backups. */
export const SECRET_SETTING_KEYS = new Set<string>(
	ALL_KEYS.filter((k) => SETTING_REGISTRY[k]?.secret),
);

export function getSettingMeta(key: string): SettingMeta | undefined {
	// Own keys only: "constructor" / "__proto__" / "toString" are not settings.
	return Object.hasOwn(SETTING_REGISTRY, key) ? SETTING_REGISTRY[key] : undefined;
}

export function isSecretKey(key: string): boolean {
	return SECRET_SETTING_KEYS.has(key);
}

/** Mask a secret's value for API responses; pass non-secrets through. */
export function maskSecret(key: string, value: string): string {
	return isSecretKey(key) && value ? SECRET_MASK : value;
}

/** Whether a key's value belongs in an exported backup (secrets never do). */
export function shouldBackup(key: string): boolean {
	return !isSecretKey(key);
}

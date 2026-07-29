// ─── Canonical settings registry ────────────────────────────────────────────
// One source of truth for every site_settings key: its sanitizer kind, max
// length, whether it is a secret (masked in responses, excluded from backups),
// and whether it belongs to the wallet config surface. Consumers (settings /
// wallet / backup routers) derive secret sets, masking, backup policy, and the
// key whitelist from here instead of maintaining their own drifting copies.

export type SettingKind =
	| "text" // HTML-stripped, length-clamped
	| "url" // must be http(s) if non-empty
	| "color" // #RRGGBB if non-empty
	| "css" // custom CSS sanitizer
	| "timezone" // IANA zone
	| "emailProvider" // enum
	| "emailFrom" // must contain @
	| "apiKey" // control chars stripped, capped
	| "boolean" // coerced to "true"/"false"
	| "contactDelivery" // email|database|both (default database)
	| "captchaProvider" // none|turnstile|recaptcha|hcaptcha
	| "opaque"; // stored verbatim (enums/toggles/JSON validated elsewhere)

/** Allowed CAPTCHA providers (empty string = unset). */
export const CAPTCHA_PROVIDERS = ["none", "turnstile", "recaptcha", "hcaptcha"] as const;

export interface SettingMeta {
	kind: SettingKind;
	/** Max character length for `text`/`apiKey` kinds. */
	maxLength?: number;
	/** Secret: masked in API responses and never written to a backup. */
	secret?: boolean;
	/** Part of the wallet config surface (managed by the wallet router). */
	wallet?: boolean;
}

/** Hard cap on any single stored value (bytes ≈ chars); rejects abuse. */
export const MAX_SETTING_VALUE_LENGTH = 100_000;

/** The mask shown in place of a secret value. */
export const SECRET_MASK = "••••••";

export const SETTING_REGISTRY: Record<string, SettingMeta> = {
	// Profile
	profile_name: { kind: "text", maxLength: 50 },
	bio: { kind: "text", maxLength: 300 },
	avatar_url: { kind: "url" },
	verified_badge: { kind: "opaque" },
	// Banner
	banner_preset: { kind: "opaque" },
	banner_enabled: { kind: "opaque" },
	banner_mode: { kind: "opaque" },
	banner_custom_url: { kind: "url" },
	// Appearance
	theme_preset: { kind: "opaque" },
	theme: { kind: "opaque" },
	custom_primary: { kind: "color" },
	custom_secondary: { kind: "color" },
	custom_accent: { kind: "color" },
	custom_background: { kind: "color" },
	custom_css: { kind: "css" },
	social_icon_shape: { kind: "opaque" },
	default_color_mode: { kind: "opaque" },
	// SEO
	seo_title: { kind: "text", maxLength: 100 },
	seo_description: { kind: "text", maxLength: 250 },
	seo_og_image: { kind: "url" },
	seo_og_mode: { kind: "text" },
	seo_og_template: { kind: "text" },
	// Branding
	branding_enabled: { kind: "opaque" },
	branding_text: { kind: "text", maxLength: 100 },
	branding_link: { kind: "url" },
	branding_logo_url: { kind: "url" },
	branding_login_logo_url: { kind: "url" },
	branding_login_bg_mode: { kind: "opaque" },
	branding_login_bg_preset: { kind: "opaque" },
	branding_login_bg_custom_url: { kind: "url" },
	branding_favicon_url: { kind: "url" },
	branding_site_name: { kind: "text", maxLength: 50 },
	branding_pp_url: { kind: "url" },
	branding_tos_url: { kind: "url" },
	branding_pp_mode: { kind: "text" },
	branding_pp_text: { kind: "text" },
	branding_tos_mode: { kind: "text" },
	branding_tos_text: { kind: "text" },
	// Features
	wallet_pass_enabled: { kind: "boolean", wallet: true },
	vcard_enabled: { kind: "opaque" },
	contact_form_enabled: { kind: "opaque" },
	// Auth / CAPTCHA
	captcha_provider: { kind: "captchaProvider" },
	captcha_site_key: { kind: "opaque" },
	captcha_secret_key: { kind: "apiKey", maxLength: 512, secret: true },
	magic_link_enabled: { kind: "opaque" },
	// Email
	email_provider: { kind: "emailProvider" },
	email_api_key: { kind: "apiKey", maxLength: 512, secret: true },
	email_from: { kind: "emailFrom" },
	contact_delivery: { kind: "contactDelivery" },
	// System
	timezone: { kind: "timezone" },
	admin_branding_enabled: { kind: "boolean" },
	mapkit_enabled: { kind: "boolean" },
	mapkit_token: { kind: "apiKey", maxLength: 512, secret: true },
	// Consent
	consent_banner_enabled: { kind: "opaque" },
	consent_banner_text: { kind: "text" },
	consent_privacy_url: { kind: "url" },
	consent_categories: { kind: "opaque" },
	// Wallet (managed by the wallet router; validated structurally there)
	wallet_show_email: { kind: "opaque", wallet: true },
	wallet_show_name: { kind: "opaque", wallet: true },
	wallet_show_qr_code: { kind: "opaque", wallet: true },
	wallet_template_preset: { kind: "opaque", wallet: true },
	wallet_organization_name: { kind: "text", maxLength: 100, wallet: true },
	wallet_pass_description: { kind: "text", maxLength: 200, wallet: true },
	wallet_background_color: { kind: "color", wallet: true },
	wallet_foreground_color: { kind: "color", wallet: true },
	wallet_label_color: { kind: "color", wallet: true },
	wallet_logo_url: { kind: "url", wallet: true },
	wallet_icon_url: { kind: "url", wallet: true },
	wallet_thumbnail_url: { kind: "url", wallet: true },
	wallet_strip_url: { kind: "url", wallet: true },
	wallet_header_fields: { kind: "opaque", wallet: true },
	wallet_primary_fields: { kind: "opaque", wallet: true },
	wallet_secondary_fields: { kind: "opaque", wallet: true },
	wallet_auxiliary_fields: { kind: "opaque", wallet: true },
	wallet_back_fields: { kind: "opaque", wallet: true },
	wallet_relevant_date: { kind: "opaque", wallet: true },
	wallet_locations: { kind: "opaque", wallet: true },
	wallet_signer_cert: { kind: "opaque", wallet: true, secret: true },
	wallet_signer_key: { kind: "opaque", wallet: true, secret: true },
	wallet_wwdr_cert: { kind: "opaque", wallet: true, secret: true },
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
	return SETTING_REGISTRY[key];
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

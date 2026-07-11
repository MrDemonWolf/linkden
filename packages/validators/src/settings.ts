import { z } from "zod";

// All valid setting keys — prevents arbitrary key injection at the API boundary
// and gives the web client an exhaustive type for typed updates.
export const VALID_SETTING_KEYS = [
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
	"branding_login_logo_url",
	"branding_login_bg_mode",
	"branding_login_bg_preset",
	"branding_login_bg_custom_url",
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

export type SettingKey = (typeof VALID_SETTING_KEYS)[number];

export const settingKeySchema = z.enum(VALID_SETTING_KEYS);

export const updateSettingSchema = z.object({
	key: settingKeySchema,
	value: z.string(),
});

export const themeSettingsSchema = z.object({
	preset: z.string().optional(),
	customColors: z
		.object({
			primary: z.string().optional(),
			secondary: z.string().optional(),
			accent: z.string().optional(),
			background: z.string().optional(),
		})
		.optional(),
});

export const captchaSettingsSchema = z.object({
	provider: z.string().optional(),
	siteKey: z.string().optional(),
	secretKey: z.string().optional(),
});

export const contactFormSettingsSchema = z.object({
	enabled: z.boolean().optional(),
	fields: z
		.object({
			phone: z.boolean().optional(),
			subject: z.boolean().optional(),
			company: z.boolean().optional(),
		})
		.optional(),
	delivery: z
		.object({
			email: z.string().email().optional(),
			webhook: z.string().url().optional(),
		})
		.optional(),
});

export const emailSettingsSchema = z.object({
	provider: z.string().optional(),
	apiKey: z.string().optional(),
	from: z.string().optional(),
});

export const seoSettingsSchema = z.object({
	title: z.string().optional(),
	description: z.string().optional(),
	ogImage: z.string().optional(),
});

export const brandingSettingsSchema = z.object({
	enabled: z.boolean().optional(),
	text: z.string().optional(),
	link: z.string().optional(),
});

export const walletSettingsSchema = z.object({
	enabled: z.boolean().optional(),
	teamId: z.string().optional(),
	passTypeId: z.string().optional(),
	customQrUrl: z.string().optional(),
});

export const vcardDataSchema = z.object({
	fullName: z.string().optional(),
	nickname: z.string().optional(),
	birthday: z.string().optional(),
	photo: z.string().optional(),
	org: z.string().optional(),
	title: z.string().optional(),
	department: z.string().optional(),
	workEmail: z.string().email().optional(),
	workPhone: z.string().optional(),
	email: z.string().email().optional(),
	phone: z.string().optional(),
	address: z.string().optional(),
	urls: z.array(z.string().url()).optional(),
});

export const vcardSettingsSchema = z.object({
	enabled: z.boolean().optional(),
	vcardData: vcardDataSchema.optional(),
});

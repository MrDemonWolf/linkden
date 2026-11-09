// Settings getPage actually returns. Read by key so a page view never pulls the
// secret rows (wallet signer key, API keys) or large unused blobs out of D1.
export const PUBLIC_PAGE_SETTING_KEYS = [
	"profile_name",
	"avatar_url",
	"bio",
	"verified_badge",
	"page_layout",
	"theme",
	"theme_preset",
	"custom_primary",
	"custom_secondary",
	"custom_accent",
	"custom_background",
	"custom_css",
	"social_icon_shape",
	"default_color_mode",
	"seo_title",
	"seo_description",
	"seo_og_image",
	"seo_og_mode",
	"seo_og_template",
	"site_language",
	"branding_enabled",
	"branding_text",
	"branding_link",
	"branding_logo_url",
	"branding_favicon_url",
	"branding_site_name",
	"branding_pp_url",
	"branding_pp_mode",
	"branding_pp_text",
	"branding_tos_url",
	"branding_tos_mode",
	"branding_tos_text",
	"banner_preset",
	"banner_enabled",
	"banner_mode",
	"banner_custom_url",
	"vcard_enabled",
	"vcard_data",
	"contact_form_enabled",
	"captcha_provider",
	"captcha_site_key",
	"consent_banner_enabled",
	"consent_banner_text",
	"consent_privacy_url",
	"consent_categories",
] as const;

/** Explicit public response fields only. Callers calculate vCard availability from visible cards. */
export function resolvePublicPageSettings(
	settings: Readonly<Record<string, string | undefined>>,
	vcardDownloadAvailable: boolean,
) {
	const captchaProvider: "turnstile" | "recaptcha" | "hcaptcha" | "none" =
		settings.captcha_provider === "turnstile" ||
		settings.captcha_provider === "recaptcha" ||
		settings.captcha_provider === "hcaptcha"
			? settings.captcha_provider
			: "none";
	const ppMode: "text" | "url" = settings.branding_pp_mode === "text" ? "text" : "url";
	const tosMode: "text" | "url" = settings.branding_tos_mode === "text" ? "text" : "url";
	const ppUrl = ppMode === "url" ? settings.branding_pp_url || null : null;
	const pageLayout: "split" | "stacked" = settings.page_layout === "stacked" ? "stacked" : "split";
	return {
		pageLayout,
		seoTitle: settings.seo_title || null,
		seoDescription: settings.seo_description || null,
		seoOgImage: settings.seo_og_image || null,
		seoOgMode: settings.seo_og_mode || null,
		seoOgTemplate: settings.seo_og_template || null,
		brandingEnabled: settings.branding_enabled !== "false",
		brandingText: settings.branding_text || "Powered by LinkDen · by MrDemonWolf, Inc.",
		brandingLink: settings.branding_link || null,
		defaultColorMode: settings.default_color_mode || "system",
		vcardEnabled: settings.vcard_enabled === "true",
		vcardDownloadAvailable,
		contactFormEnabled: settings.contact_form_enabled === "true",
		captchaProvider,
		captchaSiteKey: captchaProvider !== "none" ? settings.captcha_site_key || null : null,
		bannerPreset: settings.banner_preset || null,
		bannerEnabled: settings.banner_enabled === "true",
		bannerMode: (settings.banner_mode as "preset" | "custom") || "preset",
		bannerCustomUrl: settings.banner_custom_url || null,
		themePreset: settings.theme_preset || "default",
		customPrimary: settings.custom_primary || null,
		customSecondary: settings.custom_secondary || null,
		customAccent: settings.custom_accent || null,
		customBackground: settings.custom_background || null,
		customCss: settings.custom_css || null,
		socialIconShape: (settings.social_icon_shape as "circle" | "rounded-square") || null,
		brandingLogoUrl: settings.branding_logo_url || null,
		brandingFaviconUrl: settings.branding_favicon_url || null,
		brandingSiteName: settings.branding_site_name || null,
		brandingPpUrl: ppUrl,
		brandingTosUrl: tosMode === "url" ? settings.branding_tos_url || null : null,
		brandingPpMode: ppMode,
		brandingPpText: ppMode === "text" ? settings.branding_pp_text || null : null,
		brandingTosMode: tosMode,
		brandingTosText: tosMode === "text" ? settings.branding_tos_text || null : null,
		consentBannerEnabled: settings.consent_banner_enabled !== "false",
		consentBannerText: settings.consent_banner_text || null,
		consentPrivacyUrl: settings.consent_privacy_url || ppUrl,
		consentCategories: settings.consent_categories || null,
		siteLanguage: settings.site_language || null,
	};
}

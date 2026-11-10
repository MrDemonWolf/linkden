import { describe, expect, it } from "vitest";
import { resolvePublicPageSettings } from "../public-settings";

describe("public settings response", () => {
	it("retains public defaults and caller-computed vCard availability", () => {
		expect(resolvePublicPageSettings({}, false)).toMatchObject({
			pageLayout: "split",
			brandingEnabled: true,
			defaultColorMode: "system",
			bannerMode: "preset",
			themePreset: "default",
			socialIconShape: null,
			vcardDownloadAvailable: false,
			consentBannerEnabled: true,
		});
		expect(resolvePublicPageSettings({ vcard_enabled: "true" }, true)).toMatchObject({
			vcardEnabled: true,
			vcardDownloadAvailable: true,
		});
	});

	it("resolves whole-page layout and preserves the split default for unset or invalid values", () => {
		expect(resolvePublicPageSettings({ page_layout: "stacked" }, false).pageLayout).toBe("stacked");
		for (const page_layout of [undefined, "", "split", "grid", "unsupported"]) {
			expect(resolvePublicPageSettings({ page_layout }, false).pageLayout).toBe("split");
		}
	});

	it("hides stale legal alternatives and falls back to the selected privacy URL", () => {
		const settings = {
			branding_pp_url: "https://example.com/privacy",
			branding_pp_text: "Privacy text",
			branding_tos_url: "https://example.com/terms",
			branding_tos_text: "Terms text",
		};
		expect(resolvePublicPageSettings(settings, false)).toMatchObject({
			brandingPpUrl: settings.branding_pp_url,
			brandingPpText: null,
			brandingTosUrl: settings.branding_tos_url,
			brandingTosText: null,
			consentPrivacyUrl: settings.branding_pp_url,
		});
		expect(
			resolvePublicPageSettings(
				{ ...settings, branding_pp_mode: "text", branding_tos_mode: "text" },
				false,
			),
		).toMatchObject({
			brandingPpUrl: null,
			brandingPpText: settings.branding_pp_text,
			brandingTosUrl: null,
			brandingTosText: settings.branding_tos_text,
			consentPrivacyUrl: null,
		});
	});

	it("never spreads unknown or secret values and fails closed on unsupported CAPTCHA providers", () => {
		const response = resolvePublicPageSettings(
			{
				captcha_provider: "constructor",
				captcha_site_key: "PRIVATE_UNUSED_SITE_KEY",
				captcha_secret_key: "PRIVATE_CAPTCHA_SECRET",
				email_api_key: "PRIVATE_EMAIL_KEY",
				unregistered: "PRIVATE_UNKNOWN",
			},
			false,
		);
		expect(response.captchaProvider).toBe("none");
		expect(response.captchaSiteKey).toBeNull();
		expect(JSON.stringify(response)).not.toContain("PRIVATE_");
	});
});

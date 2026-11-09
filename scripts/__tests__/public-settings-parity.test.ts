// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { prepareStaticPublicPage } from "../../apps/web/src/lib/static-public-page";
import { createPublicationArtifacts } from "../lib/public-artifacts";

vi.mock("../../packages/env/src/server", () => ({ env: {} }));
vi.mock("../../packages/db/src/index", async () => {
	const { createTestDb } = await import("../../packages/db/src/testing");
	const { db } = await createTestDb();
	return { db };
});

const { db } = await import("../../packages/db/src/index");
const { siteSettings } = await import("../../packages/db/src/schema/index");
const { appRouter } = await import("../../packages/api/src/routers/index");
const caller = appRouter.createCaller({ session: null, headers: new Headers() });
const admin = appRouter.createCaller({
	session: { user: { id: "admin" } },
	headers: new Headers(),
} as never);

beforeEach(async () => {
	await db.delete(siteSettings);
});

async function settingsForBoth(settings: Record<string, string>) {
	await db
		.insert(siteSettings)
		.values(Object.entries(settings).map(([key, value]) => ({ key, value })));
	const live = await caller.public.getPage();
	const artifacts = createPublicationArtifacts({
		revision: "settings-parity",
		publicOrigin: "https://profile.example.test",
		builtAt: "2026-11-05T12:00:00.000Z",
		profile: { name: "Fixture", image: null, bio: null, isVerified: false },
		settings,
		blocks: [],
		socialNetworks: [],
	});
	const { payload } = await prepareStaticPublicPage(artifacts.snapshot);
	return { live: live.settings, published: payload.data.settings };
}

describe("live and static public settings contract", () => {
	it.each(["url", "text"])(
		"preserves non-default public fields and %s legal documents",
		async (mode) => {
			const settings = {
				page_layout: mode === "text" ? "stacked" : "split",
				seo_title: "Fixture title",
				seo_description: "Fixture description",
				seo_og_mode: "custom",
				seo_og_image: "https://images.example.com/og.png",
				seo_og_template: "bold",
				branding_enabled: "false",
				branding_text: "Fixture branding",
				branding_link: "https://example.com/brand",
				branding_logo_url: "https://images.example.com/logo.png",
				branding_favicon_url: "https://images.example.com/favicon.png",
				branding_site_name: "Fixture site",
				branding_pp_mode: mode,
				branding_pp_url: "https://example.com/privacy",
				branding_pp_text: "Fixture privacy",
				branding_tos_mode: mode,
				branding_tos_url: "https://example.com/terms",
				branding_tos_text: "Fixture terms",
				default_color_mode: "dark",
				contact_form_enabled: "true",
				captcha_provider: "turnstile",
				captcha_site_key: "public-site-key",
				banner_enabled: "true",
				banner_preset: "carbon-fiber",
				banner_mode: "custom",
				banner_custom_url: "https://images.example.com/banner.png",
				theme_preset: "forest",
				custom_primary: "#123456",
				custom_secondary: "#234567",
				custom_accent: "#345678",
				custom_background: "#456789",
				custom_css: ".ld-bio { font-weight: 500; }",
				social_icon_shape: "rounded-square",
				consent_banner_enabled: "true",
				consent_banner_text: "Fixture consent",
				consent_privacy_url: "https://example.com/cookies",
				consent_categories: JSON.stringify({
					functional: true,
					analytics: false,
					marketing: false,
				}),
				site_language: "pt-BR",
				vcard_enabled: "true",
				vcard_data: JSON.stringify({ fullName: "Fixture contact" }),
				email_api_key: "PRIVATE_EMAIL_KEY",
				captcha_secret_key: "PRIVATE_CAPTCHA_SECRET",
			};
			const { live, published } = await settingsForBoth(settings);
			const { consentCategories: publishedCategories, ...publishedFields } = published;
			const { consentCategories: liveCategories, ...liveFields } = live;
			expect(publishedFields).toEqual(liveFields);
			// The compiler reserializes JSON settings; key order is not a contract difference.
			expect(JSON.parse(publishedCategories ?? "null")).toEqual(
				JSON.parse(liveCategories ?? "null"),
			);
			expect(JSON.parse(publishedCategories ?? "null")).toEqual({
				analytics: false,
				marketing: false,
				functional: true,
			});
			expect(published).toMatchObject({
				pageLayout: settings.page_layout,
				seoOgMode: "custom",
				seoOgTemplate: "bold",
				brandingLogoUrl: settings.branding_logo_url,
				brandingSiteName: "Fixture site",
				brandingTosMode: mode,
				brandingTosText: mode === "text" ? "Fixture terms" : null,
				brandingTosUrl: mode === "url" ? settings.branding_tos_url : null,
				vcardDownloadAvailable: true,
			});
			expect(JSON.stringify(published)).not.toContain("PRIVATE_");
		},
	);

	it("shares the unset-provider and unset-shape defaults", async () => {
		const { live, published } = await settingsForBoth({ profile_name: "Fixture" });
		expect(published).toEqual(live);
		expect(published.captchaProvider).toBe("none");
		expect(published.captchaSiteKey).toBeNull();
		expect(published.socialIconShape).toBeNull();
		expect(published.pageLayout).toBe("split");
	});

	it("validates page layout saves and preserves them through backup restoration", async () => {
		await admin.settings.update({ key: "page_layout", value: "stacked" });
		expect((await caller.public.getPage()).settings.pageLayout).toBe("stacked");
		await expect(
			admin.settings.update({ key: "page_layout", value: "grid" }),
		).rejects.toMatchObject({
			code: "BAD_REQUEST",
		});
		const backup = await admin.backup.export();
		expect(backup.data.settings.page_layout).toBe("stacked");
		await admin.settings.update({ key: "page_layout", value: "split" });
		await admin.backup.import({ mode: "merge", data: { settings: backup.data.settings } });
		expect((await caller.public.getPage()).settings.pageLayout).toBe("stacked");
	});
});

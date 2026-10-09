import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

// The public router imports the D1 `db` singleton; point it at the in-memory
// libsql test database so getPage runs against real tables.
// Workers-only module; the router only reads env inside submitContact/track*.
vi.mock("@linkden/env/server", () => ({ env: {} }));
vi.mock("@linkden/db", async () => {
	const { createTestDb } = await import("@linkden/db/testing");
	const { db } = await createTestDb();
	return { db };
});

const { db } = await import("@linkden/db");
const { block, siteSettings, user } = await import("@linkden/db/schema/index");
const { getSettingMeta, isSecretKey } = await import("@linkden/validators/settings-registry");
const { appRouter } = await import("../routers/index");
const { PUBLIC_PAGE_SETTING_KEYS } = await import("../routers/public");

const caller = appRouter.createCaller({ session: null, headers: new Headers() } as never);

async function setSettings(values: Record<string, string>) {
	for (const [key, value] of Object.entries(values)) {
		await db
			.insert(siteSettings)
			.values({ key, value })
			.onConflictDoUpdate({ target: siteSettings.key, set: { value } });
	}
}

async function seedBlock(
	id: string,
	fields: Partial<typeof block.$inferInsert> = {},
): Promise<void> {
	await db.insert(block).values({
		id,
		type: "link",
		title: id,
		position: 0,
		isEnabled: true,
		status: "published",
		url: "https://example.com",
		createdAt: new Date(),
		updatedAt: new Date(),
		...fields,
	});
}

beforeAll(async () => {
	await db.insert(user).values({
		id: "u1",
		name: "login-name",
		email: "a@b.co",
		emailVerified: true,
		createdAt: new Date(),
		updatedAt: new Date(),
	});
});

beforeEach(async () => {
	await db.delete(block);
	await db.delete(siteSettings);
});

describe("public.getPage profile name", () => {
	it("falls back to the account name when profile_name is unset", async () => {
		const page = await caller.public.getPage();
		expect(page.profile?.name).toBe("login-name");
	});

	it("uses the profile_name setting the Profile editor writes", async () => {
		await setSettings({ profile_name: "Nathan Dev" });
		const page = await caller.public.getPage();
		expect(page.profile?.name).toBe("Nathan Dev");
	});
});

describe("public.getPage blocks", () => {
	it("serves only enabled, published blocks inside their schedule window", async () => {
		const day = 86_400_000;
		await seedBlock("live");
		await seedBlock("draft", { status: "draft" });
		await seedBlock("off", { isEnabled: false });
		await seedBlock("future", { scheduledStart: new Date(Date.now() + day) });
		await seedBlock("expired", { scheduledEnd: new Date(Date.now() - day) });
		await seedBlock("window", {
			scheduledStart: new Date(Date.now() - day),
			scheduledEnd: new Date(Date.now() + day),
		});
		const page = await caller.public.getPage();
		expect(page.blocks.map((b) => b.id).sort()).toEqual(["live", "window"]);
	});

	it("orders tied positions deterministically by creation time", async () => {
		await seedBlock("second", { position: 1, createdAt: new Date(2_000) });
		await seedBlock("first", { position: 1, createdAt: new Date(1_000) });
		await seedBlock("top", { position: 0, createdAt: new Date(3_000) });
		const page = await caller.public.getPage();
		expect(page.blocks.map((b) => b.id)).toEqual(["top", "first", "second"]);
	});
});

describe("public.getPage settings", () => {
	it("reads only registered, non-secret settings", () => {
		expect(PUBLIC_PAGE_SETTING_KEYS.filter((k) => !getSettingMeta(k))).toEqual([]);
		expect(PUBLIC_PAGE_SETTING_KEYS.filter((k) => isSecretKey(k))).toEqual([]);
	});

	it("exposes the CAPTCHA provider and site key, never the secret", async () => {
		await setSettings({
			captcha_provider: "turnstile",
			captcha_site_key: "0xSITE",
			captcha_secret_key: "0xSECRET",
		});
		const page = await caller.public.getPage();
		expect(page.settings.captchaProvider).toBe("turnstile");
		expect(page.settings.captchaSiteKey).toBe("0xSITE");
		expect(JSON.stringify(page)).not.toContain("0xSECRET");
	});

	it("reports an unknown or unset CAPTCHA provider as none", async () => {
		expect((await caller.public.getPage()).settings.captchaProvider).toBe("none");
		await setSettings({ captcha_provider: "constructor", captcha_site_key: "k" });
		const page = await caller.public.getPage();
		expect(page.settings.captchaProvider).toBe("none");
		expect(page.settings.captchaSiteKey).toBeNull();
	});

	it("honours the privacy policy mode and reuses it for the consent banner", async () => {
		await setSettings({ branding_pp_mode: "url", branding_pp_url: "https://ex.com/privacy" });
		let page = await caller.public.getPage();
		expect(page.settings.brandingPpUrl).toBe("https://ex.com/privacy");
		expect(page.settings.consentPrivacyUrl).toBe("https://ex.com/privacy");
		expect(page.settings.brandingPpText).toBeNull();

		// Switching to text mode must not keep linking the old URL.
		await setSettings({ branding_pp_mode: "text", branding_pp_text: "We keep little." });
		page = await caller.public.getPage();
		expect(page.settings.brandingPpMode).toBe("text");
		expect(page.settings.brandingPpUrl).toBeNull();
		expect(page.settings.brandingPpText).toBe("We keep little.");
		expect(page.settings.consentPrivacyUrl).toBeNull();
	});

	it("prefers an explicit consent privacy URL", async () => {
		await setSettings({
			branding_pp_url: "https://ex.com/privacy",
			consent_privacy_url: "https://ex.com/cookies",
		});
		const page = await caller.public.getPage();
		expect(page.settings.consentPrivacyUrl).toBe("https://ex.com/cookies");
	});
});

describe("public.getPage footer vCard, branding link, language", () => {
	it("reports vcardDownloadAvailable only when /api/vcard has a card to serve", async () => {
		expect((await caller.public.getPage()).settings.vcardDownloadAvailable).toBe(false);

		await setSettings({ vcard_enabled: "true" });
		// Enabled but empty: the download would 404.
		expect((await caller.public.getPage()).settings.vcardDownloadAvailable).toBe(false);

		await setSettings({ vcard_data: JSON.stringify({ fullName: "Ada" }) });
		expect((await caller.public.getPage()).settings.vcardDownloadAvailable).toBe(true);

		await setSettings({ vcard_data: "" });
		await seedBlock("card", { type: "vcard", config: JSON.stringify({ email: "a@b.co" }) });
		expect((await caller.public.getPage()).settings.vcardDownloadAvailable).toBe(true);

		await setSettings({ vcard_enabled: "false" });
		expect((await caller.public.getPage()).settings.vcardDownloadAvailable).toBe(false);
	});

	it("passes the footer branding link and the page language through", async () => {
		let page = await caller.public.getPage();
		expect(page.settings.brandingLink).toBeNull();
		expect(page.settings.siteLanguage).toBeNull();
		await setSettings({ branding_link: "https://ex.com", site_language: "pt-BR" });
		page = await caller.public.getPage();
		expect(page.settings.brandingLink).toBe("https://ex.com");
		expect(page.settings.siteLanguage).toBe("pt-BR");
	});
});

describe("public.getSetupStatus", () => {
	const email = { email_api_key: "re_live", email_from: "site@ex.com" };

	it("reports emailConfigured as a boolean only, never the key or sender", async () => {
		let status = await caller.public.getSetupStatus();
		expect(status.emailConfigured).toBe(false);
		await setSettings(email);
		status = await caller.public.getSetupStatus();
		expect(status.emailConfigured).toBe(true);
		expect(JSON.stringify(status)).not.toContain("re_live");
		expect(JSON.stringify(status)).not.toContain("site@ex.com");
		// A provider without a transport can't send.
		await setSettings({ email_provider: "sendgrid" });
		expect((await caller.public.getSetupStatus()).emailConfigured).toBe(false);
	});

	it("offers magic link only when it is on, email works and 2FA is off", async () => {
		await setSettings({ magic_link_enabled: "true" });
		expect((await caller.public.getSetupStatus()).magicLinkEnabled).toBe(false);

		await setSettings(email);
		expect((await caller.public.getSetupStatus()).magicLinkEnabled).toBe(true);

		await db.update(user).set({ twoFactorEnabled: true });
		try {
			expect((await caller.public.getSetupStatus()).magicLinkEnabled).toBe(false);
		} finally {
			await db.update(user).set({ twoFactorEnabled: false });
		}
	});
});

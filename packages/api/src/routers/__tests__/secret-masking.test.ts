import { beforeEach, describe, expect, it, vi } from "vitest";

// Router-level guarantee behind the settings forms: they send back the masked
// value they received, so losing the mask filter would overwrite real secrets.
vi.mock("@linkden/env/server", () => ({ env: {} }));
vi.mock("@linkden/db", async () => {
	const { createTestDb } = await import("@linkden/db/testing");
	const { db } = await createTestDb();
	return { db };
});

const { db } = await import("@linkden/db");
const { siteSettings } = await import("@linkden/db/schema/index");
const { SECRET_MASK } = await import("@linkden/validators/settings-registry");
const { appRouter } = await import("../index");
const { eq } = await import("drizzle-orm");

const admin = appRouter.createCaller({
	session: { user: { id: "u1" } },
	headers: new Headers(),
} as never);
const anon = appRouter.createCaller({ session: null, headers: new Headers() } as never);

const API_KEY = "re_live_123";
const SIGNER_KEY = "-----BEGIN PRIVATE KEY-----\nSECRETPEMBODY\n-----END PRIVATE KEY-----";

async function stored(key: string) {
	const [row] = await db.select().from(siteSettings).where(eq(siteSettings.key, key));
	return row?.value;
}

describe("secret settings never leave the server and survive a masked re-save", () => {
	beforeEach(async () => {
		await db.delete(siteSettings);
		await db.insert(siteSettings).values([
			{ key: "email_api_key", value: API_KEY },
			{ key: "wallet_signer_key", value: SIGNER_KEY },
			{ key: "email_from", value: "old@example.com" },
		]);
	});

	it("masks secrets in settings.get / getAll and wallet.getConfig", async () => {
		const all = await admin.settings.getAll();
		expect(all.email_api_key).toBe(SECRET_MASK);
		const one = await admin.settings.get({ key: "email_api_key" });
		const wallet = await admin.wallet.getConfig();
		for (const payload of [all, one, wallet]) {
			const text = JSON.stringify(payload);
			expect(text).not.toContain(API_KEY);
			expect(text).not.toContain("SECRETPEMBODY");
		}
	});

	it("ignores a re-submitted mask in update and updateBulk", async () => {
		await admin.settings.updateBulk([
			{ key: "email_api_key", value: SECRET_MASK },
			{ key: "email_from", value: "new@example.com" },
		]);
		await admin.settings.update({ key: "email_api_key", value: SECRET_MASK });
		expect(await stored("email_api_key")).toBe(API_KEY);
		expect(await stored("email_from")).toBe("new@example.com");
	});

	it("keeps secrets out of backups and the public page", async () => {
		const exported = JSON.stringify(await admin.backup.export());
		const page = JSON.stringify(await anon.public.getPage());
		for (const text of [exported, page]) {
			expect(text).not.toContain(API_KEY);
			expect(text).not.toContain("SECRETPEMBODY");
		}
	});
});

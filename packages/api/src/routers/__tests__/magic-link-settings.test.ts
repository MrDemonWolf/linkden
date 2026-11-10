import { beforeEach, describe, expect, it, vi } from "vitest";

// The account tab blocks the magic-link switch without email or with 2FA on;
// the router enforces the same rule so the setting can't be written anyway.
vi.mock("@linkden/env/server", () => ({ env: {} }));
vi.mock("@linkden/db", async () => {
	const { createTestDb } = await import("@linkden/db/testing");
	return { db: (await createTestDb()).db };
});

const { db } = await import("@linkden/db");
const { siteSettings, user } = await import("@linkden/db/schema/index");
const { SECRET_MASK } = await import("@linkden/validators/settings-registry");
const { eq } = await import("drizzle-orm");
const { appRouter } = await import("../index");
const admin = appRouter.createCaller({
	session: { user: { id: "u1" } },
	headers: new Headers(),
} as never);

const email = {
	email_provider: "resend",
	email_api_key: "re_test_configured",
	email_from: "owner@example.com",
};
async function seed(settings: Record<string, string>) {
	await db
		.insert(siteSettings)
		.values(Object.entries(settings).map(([key, value]) => ({ key, value })));
}
async function stored(key: string) {
	return (await db.select().from(siteSettings).where(eq(siteSettings.key, key)))[0]?.value;
}

beforeEach(async () => {
	await db.delete(siteSettings);
	await db.delete(user);
	await db.insert(user).values({ id: "u1", name: "Admin", email: "admin@example.com" });
});

describe("magic-link settings policy", () => {
	it("refuses enabling without a usable email configuration", async () => {
		await expect(
			admin.settings.update({ key: "magic_link_enabled", value: "true" }),
		).rejects.toMatchObject({ code: "BAD_REQUEST", message: expect.stringMatching(/Resend/) });
		await expect(
			admin.settings.updateBulk([{ key: "magic_link_enabled", value: "true" }]),
		).rejects.toMatchObject({ code: "BAD_REQUEST", message: expect.stringMatching(/Resend/) });
		expect(await stored("magic_link_enabled")).toBeUndefined();
	});

	it("refuses enabling while two-factor is on", async () => {
		await seed(email);
		await db.update(user).set({ twoFactorEnabled: true }).where(eq(user.id, "u1"));
		await expect(
			admin.settings.update({ key: "magic_link_enabled", value: "true" }),
		).rejects.toMatchObject({ code: "BAD_REQUEST", message: expect.stringMatching(/two-factor/) });
		await expect(
			admin.settings.updateBulk([{ key: "magic_link_enabled", value: "true" }]),
		).rejects.toMatchObject({ code: "BAD_REQUEST", message: expect.stringMatching(/two-factor/) });
		expect(await stored("magic_link_enabled")).toBeUndefined();
	});

	it.each(["cloudflare", "sendgrid"])("refuses the unsupported %s provider", async (provider) => {
		await seed({ ...email, email_provider: provider });
		await expect(
			admin.settings.update({ key: "magic_link_enabled", value: "true" }),
		).rejects.toMatchObject({ code: "BAD_REQUEST" });
	});

	it("accepts the default Resend transport and retained credentials behind a mask", async () => {
		await seed({ ...email, email_provider: "" });
		await admin.settings.updateBulk([
			{ key: "email_api_key", value: SECRET_MASK },
			{ key: "magic_link_enabled", value: "true" },
		]);
		expect(await stored("email_api_key")).toBe(email.email_api_key);
		expect(await stored("magic_link_enabled")).toBe("true");
	});

	it("accepts email setup and magic-link enablement in either bulk order", async () => {
		await admin.settings.updateBulk([
			{ key: "magic_link_enabled", value: "true" },
			...Object.entries(email).map(([key, value]) => ({ key: key as keyof typeof email, value })),
		]);
		expect(await stored("magic_link_enabled")).toBe("true");
		expect(await stored("email_from")).toBe(email.email_from);
		// Once saved, a later request that only flips the switch uses the stored transport.
		await expect(
			admin.settings.updateBulk([{ key: "magic_link_enabled", value: "true" }]),
		).resolves.toEqual({ success: true });
	});

	it("does not treat an unsaved mask as credentials or partially save a rejected bulk request", async () => {
		await expect(
			admin.settings.updateBulk([
				{ key: "email_from", value: email.email_from },
				{ key: "email_api_key", value: SECRET_MASK },
				{ key: "magic_link_enabled", value: "true" },
			]),
		).rejects.toMatchObject({ code: "BAD_REQUEST" });
		expect(await db.select().from(siteSettings)).toHaveLength(0);
	});

	it("checks the final bulk values rather than a key or sender being cleared", async () => {
		await seed(email);
		await expect(
			admin.settings.updateBulk([
				{ key: "email_api_key", value: "re_test_replacement" },
				{ key: "magic_link_enabled", value: "true" },
				{ key: "email_api_key", value: "" },
			]),
		).rejects.toMatchObject({ code: "BAD_REQUEST" });
		expect(await stored("email_api_key")).toBe(email.email_api_key);
		await expect(
			admin.settings.updateBulk([
				{ key: "magic_link_enabled", value: "true" },
				{ key: "email_from", value: "" },
			]),
		).rejects.toMatchObject({ code: "BAD_REQUEST" });
		expect(await stored("email_from")).toBe(email.email_from);
	});

	it("allows disabling magic links without email or while two-factor is on", async () => {
		await expect(
			admin.settings.updateBulk([{ key: "magic_link_enabled", value: "false" }]),
		).resolves.toEqual({ success: true });
		await db.update(user).set({ twoFactorEnabled: true }).where(eq(user.id, "u1"));
		await admin.settings.update({ key: "magic_link_enabled", value: "false" });
		expect(await stored("magic_link_enabled")).toBe("false");
	});
});

describe("magic-link backup policy", () => {
	it("skips enabled magic links during two-factor without discarding other valid settings", async () => {
		await seed(email);
		await db.update(user).set({ twoFactorEnabled: true }).where(eq(user.id, "u1"));
		const result = await admin.backup.import({
			mode: "merge",
			data: { settings: { magic_link_enabled: "true", profile_name: "Restored profile" } },
		});
		expect(result.skipped.settings).toBe(1);
		expect(await stored("magic_link_enabled")).toBeUndefined();
		expect(await stored("profile_name")).toBe("Restored profile");
	});

	it("checks all sanitized incoming settings before enabling magic links", async () => {
		await seed(email);
		const result = await admin.backup.import({
			mode: "merge",
			data: { settings: { magic_link_enabled: "true", email_provider: "cloudflare" } },
		});
		expect(result.skipped.settings).toBe(1);
		expect(await stored("email_provider")).toBe("cloudflare");
		expect(await stored("magic_link_enabled")).toBeUndefined();
	});

	it("does not count the sender that replace removes, while retaining the secret key", async () => {
		await seed(email);
		const result = await admin.backup.import({
			mode: "replace",
			data: { settings: { magic_link_enabled: "true" } },
		});
		expect(result.skipped.settings).toBe(1);
		expect(await stored("email_api_key")).toBe(email.email_api_key);
		expect(await stored("email_from")).toBeUndefined();
		expect(await stored("magic_link_enabled")).toBeUndefined();
	});

	it("uses the default provider after replace removes an unsupported provider", async () => {
		await seed({ ...email, email_provider: "cloudflare" });
		const result = await admin.backup.import({
			mode: "replace",
			data: { settings: { magic_link_enabled: "true", email_from: email.email_from } },
		});
		expect(result.skipped.settings).toBe(0);
		expect(await stored("email_provider")).toBeUndefined();
		expect(await stored("magic_link_enabled")).toBe("true");
	});

	it("cannot enable email by smuggling a secret into a backup", async () => {
		const result = await admin.backup.import({
			mode: "merge",
			data: { settings: { ...email, magic_link_enabled: "true" } },
		});
		expect(result.skipped.settings).toBe(2);
		expect(await stored("email_api_key")).toBeUndefined();
		expect(await stored("magic_link_enabled")).toBeUndefined();
	});
});

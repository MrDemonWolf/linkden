import { beforeEach, describe, expect, it, vi } from "vitest";

// The account tab blocks the magic-link switch without email or with 2FA on;
// the router enforces the same rule so the setting can't be written anyway.
vi.mock("@linkden/env/server", () => ({ env: {} }));
vi.mock("@linkden/db", async () => {
	const { createTestDb } = await import("@linkden/db/testing");
	const { db } = await createTestDb();
	return { db };
});

const { db } = await import("@linkden/db");
const { siteSettings, user } = await import("@linkden/db/schema/index");
const { appRouter } = await import("../index");

const admin = appRouter.createCaller({
	session: { user: { id: "u1" } },
	headers: new Headers(),
} as never);
const enable = [{ key: "magic_link_enabled" as const, value: "true" }];

describe("magic_link_enabled can only be turned on when it can work", () => {
	beforeEach(async () => {
		await db.delete(siteSettings);
		await db.delete(user);
		await db.insert(user).values({ id: "u1", name: "Admin", email: "a@x.co" });
	});

	it("rejects it without an email provider", async () => {
		await expect(admin.settings.updateBulk(enable)).rejects.toThrow(/email provider/);
		await expect(
			admin.settings.update({ key: "magic_link_enabled", value: "true" }),
		).rejects.toThrow(/email provider/);
	});

	it("accepts it with a stored key, or one saved in the same request", async () => {
		await expect(
			admin.settings.updateBulk([...enable, { key: "email_api_key", value: "re_1" }]),
		).resolves.toEqual({ success: true });
		await expect(admin.settings.updateBulk(enable)).resolves.toEqual({ success: true });
	});

	it("rejects it while two-factor authentication is on", async () => {
		await db.insert(siteSettings).values({ key: "email_api_key", value: "re_1" });
		await db.update(user).set({ twoFactorEnabled: true });
		await expect(admin.settings.updateBulk(enable)).rejects.toThrow(/two-factor/);
	});

	it("always allows turning it off", async () => {
		await expect(
			admin.settings.updateBulk([{ key: "magic_link_enabled", value: "false" }]),
		).resolves.toEqual({ success: true });
	});
});

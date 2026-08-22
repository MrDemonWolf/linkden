import { beforeAll, describe, expect, it, vi } from "vitest";

// The public router imports the D1 `db` singleton; point it at the in-memory
// libsql test database so getPage runs against real tables.
// Workers-only module; the router only reads env inside submitContact.
vi.mock("@linkden/env/server", () => ({ env: {} }));
vi.mock("@linkden/db", async () => {
	const { createTestDb } = await import("@linkden/db/testing");
	const { db } = await createTestDb();
	return { db };
});

const { db } = await import("@linkden/db");
const { siteSettings, user } = await import("@linkden/db/schema/index");
const { appRouter } = await import("../routers/index");

const caller = appRouter.createCaller({ session: null, headers: new Headers() } as never);

describe("public.getPage profile name", () => {
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

	it("falls back to the account name when profile_name is unset", async () => {
		const page = await caller.public.getPage();
		expect(page.profile?.name).toBe("login-name");
	});

	it("uses the profile_name setting the Profile editor writes", async () => {
		await db.insert(siteSettings).values({ key: "profile_name", value: "Nathan Dev" });
		const page = await caller.public.getPage();
		expect(page.profile?.name).toBe("Nathan Dev");
	});
});

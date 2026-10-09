import { describe, expect, it, vi } from "vitest";

// social.updateBulk: one atomic batch that upserts set networks and deletes
// cleared ones; getPage only shows the active ones.
vi.mock("@linkden/env/server", () => ({ env: {} }));
vi.mock("@linkden/db", async () => {
	const { createTestDb } = await import("@linkden/db/testing");
	const { db } = await createTestDb();
	return { db };
});

const { appRouter } = await import("../routers/index");

const admin = appRouter.createCaller({
	session: { user: { id: "u1" } },
	headers: new Headers(),
} as never);
const visitor = appRouter.createCaller({ session: null, headers: new Headers() } as never);

describe("social.updateBulk", () => {
	it("upserts, keeps inactive URLs, and deletes cleared networks", async () => {
		await admin.social.updateBulk([
			{ slug: "github", url: "https://github.com/ada", isActive: true },
			{ slug: "x", url: "https://x.com/ada", isActive: false },
		]);
		await admin.social.updateBulk([
			{ slug: "github", url: "https://github.com/ada-l", isActive: true },
			{ slug: "x", url: "", isActive: false },
		]);
		const all = await admin.social.list();
		expect(all.map((s) => [s.slug, s.url])).toEqual([["github", "https://github.com/ada-l"]]);
		const page = await visitor.public.getPage();
		expect(page.socialNetworks.map((s) => s.slug)).toEqual(["github"]);
	});
});

import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@linkden/env/server", () => ({ env: { CORS_ORIGIN: "https://links.example.com" } }));
vi.mock("@linkden/db", async () => {
	const { createTestDb } = await import("@linkden/db/testing");
	const { db } = await createTestDb();
	return { db };
});

const { db } = await import("@linkden/db");
const { block, linkClick, pageView } = await import("@linkden/db/schema/index");
const { appRouter } = await import("../routers/index");

const caller = appRouter.createCaller({
	session: null,
	headers: new Headers({ "cf-ipcountry": "DE" }),
} as never);

beforeEach(async () => {
	await db.delete(linkClick);
	await db.delete(pageView);
	await db.delete(block);
	await db.insert(block).values({ id: "b1", type: "link", position: 0 });
	await db.insert(pageView).values({ id: "historical-view", country: "US" });
	await db.insert(linkClick).values({ id: "historical-click", blockId: "b1", country: "US" });
});

describe("retired public profile collectors", () => {
	it("rejects forged view submissions without changing historical rows", async () => {
		const previousViews = await db.select().from(pageView);
		await expect(caller.public.trackView()).rejects.toMatchObject({ code: "NOT_FOUND" });
		await expect(
			caller.public.trackView({ referrer: "https://forged.example/" }),
		).rejects.toMatchObject({ code: "NOT_FOUND", message: expect.stringContaining("retired") });
		expect(await db.select().from(pageView)).toEqual(previousViews);
	});

	it("rejects real and unknown block clicks without changing historical rows", async () => {
		const previousClicks = await db.select().from(linkClick);
		for (const blockId of ["b1", "unknown"]) {
			await expect(
				caller.public.trackClick({ blockId, referrer: "https://forged.example/" }),
			).rejects.toMatchObject({ code: "NOT_FOUND", message: expect.stringContaining("retired") });
		}
		expect(await db.select().from(linkClick)).toEqual(previousClicks);
	});
});

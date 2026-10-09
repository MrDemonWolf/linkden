import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

// trackView / trackClick: country comes from the trusted edge header, the
// referrer is the client's document.referrer reduced to a hostname (the site's
// own host dropped), and the user agent is never stored.
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
	headers: new Headers({
		host: "api.example.com",
		"cf-ipcountry": "DE",
		"user-agent": "Mozilla/5.0 Chrome/120.0.0.0",
		// The tracking fetch's own Referer is the link page — never stored.
		referer: "https://links.example.com/?fbclid=abc",
	}),
} as never);

beforeAll(async () => {
	await db.insert(block).values({
		id: "b1",
		type: "link",
		title: "Site",
		position: 0,
		url: "https://example.com",
		createdAt: new Date(),
		updatedAt: new Date(),
	});
});

beforeEach(async () => {
	await db.delete(pageView);
	await db.delete(linkClick);
});

describe("public.trackView", () => {
	it("stores the external referrer's hostname and the edge country, no UA", async () => {
		await caller.public.trackView({
			referrer: "https://l.instagram.com/?u=https%3A%2F%2Flinks.example.com&fbclid=x",
		});
		const [row] = await db.select().from(pageView);
		expect(row).toMatchObject({ referrer: "l.instagram.com", country: "DE", userAgent: null });
	});

	it("counts the site's own host and a missing referrer as Direct", async () => {
		await caller.public.trackView({ referrer: "https://links.example.com/about" });
		await caller.public.trackView({ referrer: "https://api.example.com/" });
		await caller.public.trackView();
		const views = await db.select().from(pageView);
		expect(views.map((v) => v.referrer)).toEqual([null, null, null]);
	});
});

describe("public.trackClick", () => {
	it("records a click on a real block with the referrer hostname", async () => {
		await caller.public.trackClick({
			blockId: "b1",
			referrer: "https://www.google.com/search?q=x",
		});
		const [row] = await db.select().from(linkClick);
		expect(row).toMatchObject({
			blockId: "b1",
			referrer: "www.google.com",
			country: "DE",
			userAgent: null,
		});
	});

	it("writes nothing for an unknown block id", async () => {
		await expect(caller.public.trackClick({ blockId: "nope" })).resolves.toEqual({
			success: true,
		});
		expect(await db.select().from(linkClick)).toHaveLength(0);
	});
});

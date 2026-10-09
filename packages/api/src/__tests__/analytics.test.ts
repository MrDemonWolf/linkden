import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

// analytics router against the in-memory libsql database, with Date pinned so
// the 7d/30d windows and the day buckets are deterministic.
vi.mock("@linkden/env/server", () => ({ env: {} }));
vi.mock("@linkden/db", async () => {
	const { createTestDb } = await import("@linkden/db/testing");
	const { db } = await createTestDb();
	return { db };
});

const { db } = await import("@linkden/db");
const { pageView, siteSettings } = await import("@linkden/db/schema/index");
const { appRouter } = await import("../routers/index");
const { getDateRange } = await import("../routers/analytics");

const caller = appRouter.createCaller({
	session: { user: { id: "u1" } },
	headers: new Headers(),
} as never);

const NOW = new Date("2026-10-07T12:00:00Z");

async function view(iso: string, referrer: string | null = null) {
	await db.insert(pageView).values({ id: crypto.randomUUID(), referrer, createdAt: new Date(iso) });
}

beforeAll(() => {
	vi.useFakeTimers({ toFake: ["Date"] });
	vi.setSystemTime(NOW);
});

afterAll(() => {
	vi.useRealTimers();
});

beforeEach(async () => {
	await db.delete(pageView);
	await db.delete(siteSettings);
});

describe("getDateRange", () => {
	it("spans the period back from now, open-ended for all time", () => {
		const { start, end } = getDateRange("30d", NOW);
		expect(end).toEqual(NOW);
		expect(start?.toISOString()).toBe("2026-09-07T12:00:00.000Z");
		expect(getDateRange("all", NOW).start).toBeNull();
	});
});

describe("analytics.viewsOverTime", () => {
	it("buckets by UTC day when no timezone is set", async () => {
		await view("2026-10-07T03:00:00Z");
		await view("2026-10-06T20:00:00Z");
		expect(await caller.analytics.viewsOverTime({ period: "7d" })).toEqual([
			{ date: "2026-10-06", count: 1 },
			{ date: "2026-10-07", count: 1 },
		]);
	});

	it("buckets by the admin's calendar day west of UTC", async () => {
		await db.insert(siteSettings).values({ key: "timezone", value: "America/Los_Angeles" });
		// 03:00Z is still the evening of Oct 6 in Los Angeles (PDT, UTC-7).
		await view("2026-10-07T03:00:00Z");
		await view("2026-10-07T10:00:00Z");
		expect(await caller.analytics.viewsOverTime({ period: "7d" })).toEqual([
			{ date: "2026-10-06", count: 1 },
			{ date: "2026-10-07", count: 1 },
		]);
	});

	it("buckets by the admin's calendar day east of UTC", async () => {
		await db.insert(siteSettings).values({ key: "timezone", value: "Asia/Kolkata" });
		// 20:00Z on Oct 6 is already 01:30 on Oct 7 in Kolkata (UTC+5:30).
		await view("2026-10-06T20:00:00Z");
		await view("2026-10-07T03:00:00Z");
		expect(await caller.analytics.viewsOverTime({ period: "7d" })).toEqual([
			{ date: "2026-10-07", count: 2 },
		]);
	});

	it("excludes views older than the period", async () => {
		await view("2026-09-01T12:00:00Z");
		await view("2026-10-05T12:00:00Z");
		expect(await caller.analytics.viewsOverTime({ period: "7d" })).toHaveLength(1);
		expect(await caller.analytics.viewsOverTime({ period: "all" })).toHaveLength(2);
	});
});

describe("analytics.overview / referrers", () => {
	it("compares the period against the one before it", async () => {
		await view("2026-10-06T12:00:00Z");
		await view("2026-10-05T12:00:00Z");
		await view("2026-09-28T12:00:00Z");
		const overview = await caller.analytics.overview({ period: "7d" });
		expect(overview.totalViews).toBe(2);
		expect(overview.previousViews).toBe(1);
	});

	it("groups referrer hostnames and skips Direct", async () => {
		await view("2026-10-06T12:00:00Z", "l.instagram.com");
		await view("2026-10-06T13:00:00Z", "l.instagram.com");
		await view("2026-10-06T14:00:00Z", null);
		expect(await caller.analytics.referrers({ period: "7d" })).toEqual([
			{ referrer: "l.instagram.com", count: 2 },
		]);
	});
});

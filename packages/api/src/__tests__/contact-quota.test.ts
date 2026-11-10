// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@linkden/db", async () => {
	const { createTestDb } = await import("@linkden/db/testing");
	const { db } = await createTestDb();
	return { db };
});
const { db } = await import("@linkden/db");
const { contactQuota } = await import("@linkden/db/schema/index");
const { CONTACT_DAILY_LIMIT, reserveContactDelivery } = await import("../utils/contact-quota");
const now = new Date("2026-11-05T12:00:00Z");

beforeEach(async () => {
	await db.delete(contactQuota);
});

describe("bounded daily contact side effects", () => {
	it("reserves only remaining capacity under concurrent requests", async () => {
		await db
			.insert(contactQuota)
			.values({ id: "site", day: "2026-11-05", reserved: CONTACT_DAILY_LIMIT - 1 });
		const results = await Promise.allSettled([
			reserveContactDelivery(now),
			reserveContactDelivery(now),
		]);
		expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
		expect(results.filter((result) => result.status === "rejected")).toHaveLength(1);
		expect(await db.select().from(contactQuota)).toEqual([
			{ id: "site", day: "2026-11-05", reserved: CONTACT_DAILY_LIMIT },
		]);
	});
	it("resets the same singleton at UTC day boundaries", async () => {
		await db
			.insert(contactQuota)
			.values({ id: "site", day: "2026-11-04", reserved: CONTACT_DAILY_LIMIT });
		await reserveContactDelivery(new Date("2026-11-05T00:00:00Z"));
		expect(await db.select().from(contactQuota)).toEqual([
			{ id: "site", day: "2026-11-05", reserved: 1 },
		]);
	});

	it("does not let an older in-flight request reset a newer day's counter", async () => {
		await db.insert(contactQuota).values({ id: "site", day: "2026-11-06", reserved: 1 });
		await expect(reserveContactDelivery(now)).rejects.toMatchObject({ code: "TOO_MANY_REQUESTS" });
		expect(await db.select().from(contactQuota)).toEqual([
			{ id: "site", day: "2026-11-06", reserved: 1 },
		]);
	});
});

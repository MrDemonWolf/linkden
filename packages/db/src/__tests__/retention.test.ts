import { describe, expect, it } from "vitest";
import { auditLog, block, contactSubmission, linkClick, pageView, session, user } from "../schema";
import { retentionDeletes } from "../retention";
import { createTestDb } from "../testing";

const NOW = new Date("2026-06-01T00:00:00Z");
const daysAgo = (n: number) => new Date(NOW.getTime() - n * 24 * 60 * 60 * 1000);

describe("retentionDeletes", () => {
	it("prunes rows past their window and expired sessions, keeps the rest", async () => {
		const { db } = await createTestDb();

		await db.insert(user).values({ id: "u1", name: "A", email: "a@example.com" });
		await db.insert(block).values({ id: "b1", type: "link", position: 0, config: "{}" });

		await db.insert(pageView).values([
			{ id: "pv_old", createdAt: daysAgo(400) },
			{ id: "pv_new", createdAt: daysAgo(10) },
		]);
		await db.insert(linkClick).values([
			{ id: "lc_old", blockId: "b1", createdAt: daysAgo(400) },
			{ id: "lc_new", blockId: "b1", createdAt: daysAgo(10) },
		]);
		await db.insert(contactSubmission).values([
			{ id: "c_old", name: "x", email: "x@e.com", message: "m", createdAt: daysAgo(400) },
			{ id: "c_new", name: "y", email: "y@e.com", message: "m", createdAt: daysAgo(10) },
		]);
		await db.insert(session).values([
			{ id: "s_exp", token: "t1", userId: "u1", expiresAt: daysAgo(1), updatedAt: daysAgo(30) },
			{ id: "s_ok", token: "t2", userId: "u1", expiresAt: daysAgo(-30), updatedAt: daysAgo(1) },
		]);
		await db.insert(auditLog).values([
			{ id: "a_old", action: "x", createdAt: daysAgo(200) },
			{ id: "a_new", action: "y", createdAt: daysAgo(10) },
		]);

		await db.batch(retentionDeletes(db, NOW) as unknown as Parameters<typeof db.batch>[0]);

		expect((await db.select().from(pageView)).map((r) => r.id)).toEqual(["pv_new"]);
		expect((await db.select().from(linkClick)).map((r) => r.id)).toEqual(["lc_new"]);
		expect((await db.select().from(contactSubmission)).map((r) => r.id)).toEqual(["c_new"]);
		expect((await db.select().from(session)).map((r) => r.id)).toEqual(["s_ok"]);
		expect((await db.select().from(auditLog)).map((r) => r.id)).toEqual(["a_new"]);
	});
});

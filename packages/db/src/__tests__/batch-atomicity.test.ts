import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { block } from "../schema/blocks";
import { createTestDb } from "../testing";

// The routers now compose multi-write operations (reorder, bulk settings,
// backup import, danger resets) into db.batch([...]). These tests pin the
// transactional guarantee that makes that safe: a batch applies fully or not
// at all.

describe("db.batch atomicity", () => {
	it("applies every statement on success", async () => {
		const { db } = await createTestDb();
		await db.insert(block).values([
			{ id: "a", type: "link", position: 0, config: "{}" },
			{ id: "b", type: "link", position: 1, config: "{}" },
		]);

		await db.batch([
			db.update(block).set({ position: 10 }).where(eq(block.id, "a")),
			db.update(block).set({ position: 11 }).where(eq(block.id, "b")),
		]);

		const rows = await db.select().from(block);
		expect(rows.find((r) => r.id === "a")?.position).toBe(10);
		expect(rows.find((r) => r.id === "b")?.position).toBe(11);
	});

	it("rolls back all statements if any fails", async () => {
		const { db } = await createTestDb();
		await db.insert(block).values({ id: "a", type: "link", position: 0, config: "{}" });

		await expect(
			db.batch([
				// This would succeed on its own...
				db.update(block).set({ position: 99 }).where(eq(block.id, "a")),
				// ...but inserting a duplicate primary key aborts the whole batch.
				db.insert(block).values({ id: "a", type: "link", position: 5, config: "{}" }),
			]),
		).rejects.toThrow();

		const [row] = await db.select().from(block).where(eq(block.id, "a"));
		expect(row?.position).toBe(0); // update rolled back
	});
});

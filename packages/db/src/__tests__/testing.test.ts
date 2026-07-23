import { describe, expect, it } from "vitest";
import { block } from "../schema/index";
import { createTestDb } from "../testing";

describe("createTestDb", () => {
	it("applies migrations and supports basic CRUD", async () => {
		const { db } = await createTestDb();
		await db.insert(block).values({
			id: "b1",
			type: "link",
			position: 0,
			config: "{}",
		});
		const rows = await db.select().from(block);
		expect(rows).toHaveLength(1);
		expect(rows[0]?.id).toBe("b1");
	});
});

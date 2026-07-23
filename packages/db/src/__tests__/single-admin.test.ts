import { describe, expect, it } from "vitest";
import { user } from "../schema/auth";
import { createTestDb } from "../testing";

// The single-admin invariant must hold at the DB level (trigger), not just in
// middleware — otherwise two concurrent sign-ups can both pass a check-then-create.

describe("single-admin trigger", () => {
	it("allows the first user", async () => {
		const { db } = await createTestDb();
		await db.insert(user).values({ id: "u1", name: "Admin", email: "a@example.com" });
		expect(await db.select().from(user)).toHaveLength(1);
	});

	it("rejects a second user", async () => {
		const { db } = await createTestDb();
		await db.insert(user).values({ id: "u1", name: "Admin", email: "a@example.com" });
		await expect(
			db.insert(user).values({ id: "u2", name: "Intruder", email: "b@example.com" }),
		).rejects.toThrow();
		expect(await db.select().from(user)).toHaveLength(1);
	});

	it("rejects the losing side when two inserts race", async () => {
		const { db } = await createTestDb();
		const results = await Promise.allSettled([
			db.insert(user).values({ id: "u1", name: "One", email: "one@example.com" }),
			db.insert(user).values({ id: "u2", name: "Two", email: "two@example.com" }),
		]);
		const fulfilled = results.filter((r) => r.status === "fulfilled");
		expect(fulfilled).toHaveLength(1);
		expect(await db.select().from(user)).toHaveLength(1);
	});
});

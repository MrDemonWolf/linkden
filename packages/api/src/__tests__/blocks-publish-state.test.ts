import { beforeEach, describe, expect, it, vi } from "vitest";

// Same in-memory libsql wiring as public-get-page.test.ts — the blocks router
// imports the D1 `db` singleton.
vi.mock("@linkden/env/server", () => ({ env: {} }));
vi.mock("@linkden/db", async () => {
	const { createTestDb } = await import("@linkden/db/testing");
	const { db } = await createTestDb();
	return { db };
});

const { db } = await import("@linkden/db");
const { block } = await import("@linkden/db/schema/index");
const { appRouter } = await import("../routers/index");
const { eq } = await import("drizzle-orm");

const caller = appRouter.createCaller({
	session: { user: { id: "u1" } },
	headers: new Headers(),
} as never);

async function seedPublished(id: string, position = 0) {
	await db.insert(block).values({
		id,
		type: "link",
		title: "Live",
		position,
		isEnabled: true,
		status: "published",
		url: "https://example.com",
		config: null,
		createdAt: new Date(),
		updatedAt: new Date(),
	});
}

async function statusOf(id: string) {
	const [row] = await db.select({ status: block.status }).from(block).where(eq(block.id, id));
	return row?.status;
}

describe("editing a published block keeps it live", () => {
	beforeEach(async () => {
		await db.delete(block);
	});

	it("update does not demote a published block to draft", async () => {
		await seedPublished("b1");
		await caller.blocks.update({ id: "b1", title: "Renamed" });
		expect(await statusOf("b1")).toBe("published");
	});

	it("reorder does not demote published blocks", async () => {
		await seedPublished("b1", 0);
		await seedPublished("b2", 1);
		await caller.blocks.reorder([
			{ id: "b1", position: 1 },
			{ id: "b2", position: 0 },
		]);
		expect(await statusOf("b1")).toBe("published");
		expect(await statusOf("b2")).toBe("published");
	});

	it("toggleEnabled does not demote a published block", async () => {
		await seedPublished("b1");
		await caller.blocks.toggleEnabled({ id: "b1", isEnabled: false });
		expect(await statusOf("b1")).toBe("published");
	});

	it("undo-after-delete restores the block with its original status", async () => {
		// The page re-creates the deleted row, passing the captured status back.
		const created = await caller.blocks.create({
			id: "b-restored",
			type: "link",
			title: "Restored",
			url: "https://example.com",
			position: 0,
			status: "published",
		});
		expect(created?.status).toBe("published");
	});

	it("a new block still starts as draft", async () => {
		const created = await caller.blocks.create({
			id: "b-new",
			type: "link",
			title: "New",
			url: "https://example.com",
			position: 0,
		});
		expect(created?.status).toBe("draft");
	});
});

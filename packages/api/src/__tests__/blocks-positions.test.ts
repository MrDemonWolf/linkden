import { beforeEach, describe, expect, it, vi } from "vitest";

// blocks.create assigns positions on the server, so a new block never collides
// with an existing one and Undo restores a block to its old slot.
vi.mock("@linkden/env/server", () => ({ env: {} }));
vi.mock("@linkden/db", async () => {
	const { createTestDb } = await import("@linkden/db/testing");
	const { db } = await createTestDb();
	return { db };
});

const { db } = await import("@linkden/db");
const { block } = await import("@linkden/db/schema/index");
const { appRouter } = await import("../routers/index");

const caller = appRouter.createCaller({
	session: { user: { id: "u1" } },
	headers: new Headers(),
} as never);

const link = { type: "link" as const, url: "https://example.com", position: 0 };

const order = async () => (await caller.blocks.list()).map((b) => [b.id, b.position]);

beforeEach(async () => {
	await db.delete(block);
});

describe("blocks.create positions", () => {
	it("appends a new block after the current maximum, ignoring the client's guess", async () => {
		await caller.blocks.create({ ...link, id: "a" });
		await caller.blocks.create({ ...link, id: "b" });
		await caller.blocks.create({ ...link, id: "c" });
		await caller.blocks.delete({ id: "b" });
		// The client sends blocks.length (2) — that slot is already taken by "c".
		const created = await caller.blocks.create({ ...link, id: "d", position: 2 });
		expect(created?.position).toBe(3);
		expect(await order()).toEqual([
			["a", 0],
			["c", 2],
			["d", 3],
		]);
	});

	it("Undo re-inserts at the old slot and shifts the blocks after it", async () => {
		await caller.blocks.create({ ...link, id: "a" });
		await caller.blocks.create({ ...link, id: "b" });
		await caller.blocks.create({ ...link, id: "c" });
		await caller.blocks.delete({ id: "b" });
		await caller.blocks.reorder([
			{ id: "a", position: 0 },
			{ id: "c", position: 1 },
		]);
		const restored = await caller.blocks.create({
			...link,
			id: "b",
			position: 1,
			status: "published",
		});
		expect(restored).toMatchObject({ id: "b", position: 1, status: "published" });
		expect(await order()).toEqual([
			["a", 0],
			["b", 1],
			["c", 2],
		]);
	});
});

describe("blocks.create page cap", () => {
	it("refuses a block past MAX_BLOCKS (reorder accepts at most that many rows)", async () => {
		const { MAX_BLOCKS } = await import("@linkden/validators/blocks");
		await db.insert(block).values(
			Array.from({ length: MAX_BLOCKS }, (_, i) => ({
				id: `fill${i}`,
				type: "divider" as const,
				position: i,
			})),
		);
		await expect(caller.blocks.create({ ...link, id: "over" })).rejects.toMatchObject({
			code: "BAD_REQUEST",
			message: `Page is limited to ${MAX_BLOCKS} blocks`,
		});
	});
});

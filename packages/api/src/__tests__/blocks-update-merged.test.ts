import { beforeEach, describe, expect, it, vi } from "vitest";

// blocks.update is partial, so the input schema alone can't see the stored
// type/config/embed fields. The router validates the merged row instead.
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

async function seed(values: Partial<typeof block.$inferInsert> & { id: string; type: string }) {
	await db.insert(block).values({
		position: 0,
		isEnabled: true,
		status: "published",
		createdAt: new Date(),
		updatedAt: new Date(),
		...values,
	} as typeof block.$inferInsert);
}

describe("blocks.update validates the merged row", () => {
	beforeEach(async () => {
		await db.delete(block);
	});

	it("rejects an embed URL that doesn't match the stored provider", async () => {
		await seed({
			id: "e1",
			type: "embed",
			embedType: "youtube",
			embedUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
		});
		await expect(
			caller.blocks.update({ id: "e1", embedUrl: "https://evil.example/x" }),
		).rejects.toThrow(/YouTube/);
	});

	it("rejects a type change the stored config doesn't fit", async () => {
		await seed({
			id: "l1",
			type: "link",
			config: JSON.stringify({ aspect: "weird" }),
		});
		await expect(caller.blocks.update({ id: "l1", type: "image" })).rejects.toThrow();
	});

	it("still accepts ordinary partial edits", async () => {
		await seed({ id: "l2", type: "link", url: "https://example.com" });
		await expect(caller.blocks.update({ id: "l2", title: "Hi" })).resolves.toMatchObject({
			title: "Hi",
		});
		await expect(caller.blocks.update({ id: "l2", config: "{}" })).resolves.toBeTruthy();
	});
});

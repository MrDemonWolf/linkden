import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@linkden/env/server", () => ({ env: {} }));
vi.mock("@linkden/db", async () => {
	const { createTestDb } = await import("@linkden/db/testing");
	return { db: (await createTestDb()).db };
});

const { db } = await import("@linkden/db");
const { block } = await import("@linkden/db/schema/index");
const { appRouter } = await import("../routers/index");
const caller = appRouter.createCaller({
	session: { user: { id: "u1" } },
	headers: new Headers(),
} as never);

async function seed(values: Partial<typeof block.$inferInsert> = {}) {
	await db.insert(block).values({
		id: "b1",
		type: "embed",
		position: 0,
		status: "published",
		embedType: "youtube",
		embedUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
		...values,
	});
}

beforeEach(async () => {
	await db.delete(block);
});

describe("blocks.update validates coupled stored values", () => {
	it("rejects a partial URL update that does not match the stored provider", async () => {
		await seed();
		await expect(
			caller.blocks.update({ id: "b1", embedUrl: "https://example.com/video" }),
		).rejects.toMatchObject({ code: "BAD_REQUEST", message: expect.stringContaining("YouTube") });
		expect((await caller.blocks.list())[0]?.embedUrl).toBe(
			"https://www.youtube.com/watch?v=dQw4w9WgXcQ",
		);
	});

	it("rejects a provider-only update when the saved URL belongs to another provider", async () => {
		await seed();
		await expect(caller.blocks.update({ id: "b1", embedType: "spotify" })).rejects.toMatchObject({
			code: "BAD_REQUEST",
			message: expect.stringContaining("Spotify"),
		});
		expect((await caller.blocks.list())[0]?.embedType).toBe("youtube");
	});

	it("rejects a type-only update when the stored config does not fit the new type", async () => {
		await seed({ type: "link", config: JSON.stringify({ aspect: "unsupported" }) });
		await expect(caller.blocks.update({ id: "b1", type: "image" })).rejects.toMatchObject({
			code: "BAD_REQUEST",
		});
		expect((await caller.blocks.list())[0]?.type).toBe("link");
	});

	it("accepts a matching provider and URL change without demoting the live block", async () => {
		await seed();
		await expect(
			caller.blocks.update({
				id: "b1",
				embedType: "spotify",
				embedUrl: "https://open.spotify.com/track/abc",
			}),
		).resolves.toMatchObject({ embedType: "spotify", status: "published" });
	});

	it("allows an embed URL to be cleared without replacing the provider", async () => {
		await seed();
		await expect(caller.blocks.update({ id: "b1", embedUrl: "" })).resolves.toMatchObject({
			embedType: "youtube",
			embedUrl: null,
		});
	});

	it("keeps an unrelated config edit independent of legacy embed metadata", async () => {
		await seed({ type: "link", config: "{}", embedType: "retired-provider" });
		await expect(
			caller.blocks.update({ id: "b1", config: '{"description":"Updated"}' }),
		).resolves.toMatchObject({
			config: '{"description":"Updated"}',
			embedType: "retired-provider",
		});
	});

	it("keeps ordinary metadata edits available on a legacy row with malformed config", async () => {
		await seed({ config: "legacy invalid JSON" });
		await expect(caller.blocks.update({ id: "b1", title: "Renamed" })).resolves.toMatchObject({
			title: "Renamed",
			config: "legacy invalid JSON",
			status: "published",
		});
	});

	it("reports a missing block before validating a coupled update", async () => {
		await expect(caller.blocks.update({ id: "missing", type: "image" })).rejects.toMatchObject({
			code: "NOT_FOUND",
		});
	});
});

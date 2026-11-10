// @vitest-environment node
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

// The sweep reads the D1 `db` singleton; point it at an in-memory libsql DB.
vi.mock("@linkden/db", async () => {
	const { createTestDb } = await import("@linkden/db/testing");
	const { db } = await createTestDb();
	return { db };
});

const { db } = await import("@linkden/db");
const { block, publicationRevision, publicationState, siteSettings } = await import(
	"@linkden/db/schema/index"
);
const { ORPHAN_GRACE_MS, runScheduledMaintenance, sweepOrphanImages } = await import(
	"../lib/retention-sweep"
);

const NOW = new Date("2026-06-01T03:00:00Z");
const old = new Date(NOW.getTime() - ORPHAN_GRACE_MS - 60_000);
const young = new Date(NOW.getTime() - 60_000);

type FakeObject = { key: string; uploaded: Date };

/** R2 stand-in whose list() pages through `pages` via a numeric cursor. */
function fakeBucket(pages: FakeObject[][], opts: { deleteFails?: boolean } = {}) {
	const list = vi.fn(async ({ cursor }: { cursor?: string } = {}) => {
		const i = cursor ? Number(cursor) : 0;
		const truncated = i < pages.length - 1;
		return { objects: pages[i] ?? [], truncated, cursor: truncated ? String(i + 1) : undefined };
	});
	const del = vi.fn(async (_keys: string | string[]) => {
		if (opts.deleteFails) throw new Error("R2 unavailable");
	});
	return { bucket: { list, delete: del } as unknown as R2Bucket, list, del };
}

const deletedKeys = (del: ReturnType<typeof fakeBucket>["del"]) =>
	del.mock.calls.flatMap(([keys]) => (Array.isArray(keys) ? keys : [keys]));

beforeAll(async () => {
	await db.insert(siteSettings).values({ key: "avatar_url", value: "/api/images/avatar/live.png" });
	await db.insert(block).values({
		id: "img-1",
		type: "image",
		position: 0,
		config: JSON.stringify({ src: "/api/images/banner/in-config.webp", alt: "x" }),
	});
});

afterEach(async () => {
	vi.restoreAllMocks();
	await db.delete(publicationState);
	await db.delete(publicationRevision);
});

describe("sweepOrphanImages", () => {
	it("retains an upload referenced only by the active immutable future approval", async () => {
		await db.insert(publicationRevision).values({
			revision: "approval",
			sourceDigest: "a".repeat(64),
			approvedSourceDigest: "b".repeat(64),
			approvalRevision: "approval",
			approvedSourceJson: JSON.stringify({
				blocks: [
					{
						scheduledStart: "2026-12-01T00:00:00.000Z",
						config: '{"src":"https://api.example/api/images/block_image/future.png"}',
					},
				],
			}),
			targetId: "test",
			rendererSourceId: "build",
			publicOrigin: "https://public.example",
			snapshotJson: "{}",
			createdAt: NOW,
		});
		const { bucket, del } = fakeBucket([
			[
				{ key: "block_image/future.png", uploaded: old },
				{ key: "block_image/orphan.png", uploaded: old },
			],
		]);
		expect(await sweepOrphanImages(bucket, NOW.getTime())).toEqual({ deleted: 1, failed: 0 });
		expect(deletedKeys(del)).toEqual(["block_image/orphan.png"]);
	});

	it("supports an older database without optional publication columns", async () => {
		vi.spyOn(db, "all").mockRejectedValueOnce(new Error("no such column: r.approved_source_json"));
		const { bucket, del } = fakeBucket([
			[
				{ key: "avatar/live.png", uploaded: old },
				{ key: "avatar/orphan.png", uploaded: old },
			],
		]);
		expect(await sweepOrphanImages(bucket, NOW.getTime())).toEqual({ deleted: 1, failed: 0 });
		expect(deletedKeys(del)).toEqual(["avatar/orphan.png"]);
	});

	it("aborts image cleanup on any other approval storage failure", async () => {
		vi.spyOn(db, "all").mockRejectedValueOnce(new Error("database unavailable"));
		const { bucket, list, del } = fakeBucket([[{ key: "block_image/future.png", uploaded: old }]]);
		await expect(sweepOrphanImages(bucket, NOW.getTime())).rejects.toThrow("database unavailable");
		expect(list).not.toHaveBeenCalled();
		expect(del).not.toHaveBeenCalled();
	});

	it("keeps referenced and young objects, deletes old orphans across pages", async () => {
		const { bucket, list, del } = fakeBucket([
			[
				{ key: "avatar/live.png", uploaded: old },
				{ key: "banner/in-config.webp", uploaded: old },
				{ key: "avatar/just-uploaded.png", uploaded: young },
				{ key: "avatar/orphan-1.png", uploaded: old },
			],
			[{ key: "og_image/orphan-2.png", uploaded: old }],
		]);

		const result = await sweepOrphanImages(bucket, NOW.getTime());

		expect(list).toHaveBeenCalledTimes(2);
		expect(deletedKeys(del).sort()).toEqual(["avatar/orphan-1.png", "og_image/orphan-2.png"]);
		expect(result).toEqual({ deleted: 2, failed: 0 });
	});

	it("counts failed deletes as failed, never as deleted", async () => {
		vi.spyOn(console, "error").mockImplementation(() => {});
		const { bucket } = fakeBucket([[{ key: "avatar/orphan.png", uploaded: old }]], {
			deleteFails: true,
		});
		expect(await sweepOrphanImages(bucket, NOW.getTime())).toEqual({ deleted: 0, failed: 1 });
	});
});

describe("runScheduledMaintenance", () => {
	it("resolves when both steps succeed", async () => {
		const { bucket, del } = fakeBucket([[{ key: "avatar/orphan.png", uploaded: old }]]);
		vi.spyOn(console, "log").mockImplementation(() => {});
		await expect(runScheduledMaintenance(bucket, NOW)).resolves.toBeUndefined();
		expect(deletedKeys(del)).toEqual(["avatar/orphan.png"]);
	});

	it("still sweeps when the prune batch fails, then rejects with a structured log", async () => {
		const errors = vi.spyOn(console, "error").mockImplementation(() => {});
		vi.spyOn(db, "batch").mockRejectedValueOnce(new Error("no such column"));
		const { bucket, del } = fakeBucket([[{ key: "avatar/orphan.png", uploaded: old }]]);

		await expect(runScheduledMaintenance(bucket, NOW)).rejects.toBeInstanceOf(AggregateError);
		expect(deletedKeys(del)).toEqual(["avatar/orphan.png"]);
		const line = JSON.parse(String(errors.mock.calls[0]?.[0]));
		expect(line).toMatchObject({
			level: "error",
			path: "scheduled",
			step: "prune",
			message: "no such column",
		});
	});

	it("rejects when orphan deletes fail so the cron run is not reported green", async () => {
		vi.spyOn(console, "error").mockImplementation(() => {});
		const { bucket } = fakeBucket([[{ key: "avatar/orphan.png", uploaded: old }]], {
			deleteFails: true,
		});
		await expect(runScheduledMaintenance(bucket, NOW)).rejects.toBeInstanceOf(AggregateError);
	});
});

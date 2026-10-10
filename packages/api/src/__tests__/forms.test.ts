import { beforeEach, describe, expect, it, vi } from "vitest";

// forms (contacts) router: paging, the matching total, and the polled unread
// aggregate.
vi.mock("@linkden/env/server", () => ({ env: {} }));
vi.mock("@linkden/db", async () => {
	const { createTestDb } = await import("@linkden/db/testing");
	const { db } = await createTestDb();
	return { db };
});

const { db } = await import("@linkden/db");
const { contactSubmission } = await import("@linkden/db/schema/index");
const { appRouter } = await import("../routers/index");

const caller = appRouter.createCaller({
	session: { user: { id: "u1" } },
	headers: new Headers(),
} as never);

async function seed(count: number, { isRead = false, blockId = "b1" } = {}) {
	const base = Date.now();
	for (let i = 0; i < count; i++) {
		await db.insert(contactSubmission).values({
			id: `${blockId}-${isRead}-${i}`,
			name: "N",
			email: "n@example.com",
			message: "m",
			isRead,
			blockId,
			createdAt: new Date(base - i * 1000),
		});
	}
}

beforeEach(async () => {
	await db.delete(contactSubmission);
});

describe("forms.list / forms.count", () => {
	it("pages past the first 50 and reports the matching total", async () => {
		await seed(80);
		const first = await caller.forms.list({ limit: 50, offset: 0 });
		const rest = await caller.forms.list({ limit: 50, offset: 50 });
		expect(first).toHaveLength(50);
		expect(rest).toHaveLength(30);
		expect(new Set([...first, ...rest].map((r) => r.id)).size).toBe(80);
		expect(await caller.forms.count()).toEqual({ total: 80 });
	});

	it("applies the same filters to list and count", async () => {
		await seed(3, { isRead: true });
		await seed(2, { isRead: false, blockId: "b2" });
		expect(await caller.forms.count({ isRead: false })).toEqual({ total: 2 });
		expect(await caller.forms.list({ isRead: false })).toHaveLength(2);
		expect(await caller.forms.count({ blockId: "b1" })).toEqual({ total: 3 });
	});
});

describe("forms.unreadCount", () => {
	it("counts every unread row, not just a loaded page", async () => {
		await seed(120);
		await seed(5, { isRead: true });
		expect(await caller.forms.unreadCount()).toEqual({ count: 120 });
	});
});

import { describe, expect, it, vi } from "vitest";

// CLAUDE.md invariant: a full reset empties EVERY table (audit_log included) in
// one batch. The check walks the schema, so a newly added table fails here
// until resetEverything covers it.
vi.mock("@linkden/env/server", () => ({ env: {} }));
vi.mock("@linkden/db", async () => {
	const { createTestDb } = await import("@linkden/db/testing");
	const { db } = await createTestDb();
	return { db };
});

const { db } = await import("@linkden/db");
const schema = await import("@linkden/db/schema/index");
const { appRouter } = await import("../index");
const { getTableName, is, sql } = await import("drizzle-orm");
const { SQLiteTable } = await import("drizzle-orm/sqlite-core");

const caller = appRouter.createCaller({
	session: { user: { id: "u1" } },
	headers: new Headers(),
} as never);

const tables = (Object.values(schema) as unknown[]).filter(
	(t): t is InstanceType<typeof SQLiteTable> => is(t, SQLiteTable),
);

async function count(table: InstanceType<typeof SQLiteTable>) {
	const [row] = await db.select({ n: sql<number>`count(*)` }).from(table);
	return Number(row?.n ?? 0);
}

async function seedAll() {
	const now = new Date();
	await db
		.insert(schema.user)
		.values({ id: "u1", name: "A", email: "a@b.co", emailVerified: true });
	await db.insert(schema.session).values({
		id: "s1",
		token: "t1",
		userId: "u1",
		expiresAt: new Date(Date.now() + 60_000),
		updatedAt: now,
	});
	await db
		.insert(schema.account)
		.values({ id: "a1", accountId: "u1", providerId: "credential", userId: "u1", updatedAt: now });
	await db
		.insert(schema.verification)
		.values({ id: "v1", identifier: "x", value: "y", expiresAt: new Date(Date.now() + 60_000) });
	await db.insert(schema.block).values({ id: "b1", type: "link", position: 0 });
	await db.insert(schema.linkClick).values({ id: "k1", blockId: "b1" });
	await db.insert(schema.pageView).values({ id: "p1" });
	await db
		.insert(schema.contactSubmission)
		.values({ id: "c1", name: "N", email: "n@b.co", message: "m" });
	await db.insert(schema.socialNetwork).values({ slug: "github", url: "https://github.com/a" });
	await db.insert(schema.siteSettings).values({ key: "profile_name", value: "A" });
	await db.insert(schema.auditLog).values({ id: "l1", action: "seed" });
	await db
		.insert(schema.twoFactor)
		.values({ id: "tf1", secret: "s", backupCodes: "c", userId: "u1" });
}

describe("danger zone", () => {
	it("deleteAllContent clears content + analytics, keeps account, settings, socials, audit", async () => {
		await seedAll();
		await caller.danger.deleteAllContent();
		expect(await count(schema.block)).toBe(0);
		expect(await count(schema.pageView)).toBe(0);
		expect(await count(schema.linkClick)).toBe(0);
		expect(await count(schema.contactSubmission)).toBe(0);
		expect(await count(schema.user)).toBe(1);
		expect(await count(schema.siteSettings)).toBe(1);
		expect(await count(schema.socialNetwork)).toBe(1);
		expect(await count(schema.auditLog)).toBeGreaterThanOrEqual(2); // seed + this action
	});

	it("resetEverything empties every table in the schema", async () => {
		await caller.danger.resetEverything();
		await seedAll();
		// Every table must have a row first, or the assertion below proves nothing.
		for (const table of tables) {
			expect(await count(table), `${getTableName(table)} seeded`).toBeGreaterThan(0);
		}
		await caller.danger.resetEverything();
		for (const table of tables) {
			expect(await count(table), `${getTableName(table)} survived the reset`).toBe(0);
		}
	});
});

// Test-only helper: builds an in-memory libsql database with the full schema
// applied, so integration tests can exercise real queries (batches, triggers,
// FKs) without a Cloudflare D1 binding. Not imported by production code.
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient, type Client } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import * as schema from "./schema";

export type TestDb = ReturnType<typeof drizzle<typeof schema>>;

const migrationsDir = join(dirname(fileURLToPath(import.meta.url)), "migrations");

export async function applyMigrations(client: Client): Promise<void> {
	// FKs are declared in the schema; enable enforcement so cascade/constraint
	// tests behave like production.
	await client.execute("PRAGMA foreign_keys = ON;");
	const files = readdirSync(migrationsDir)
		.filter((f) => f.endsWith(".sql"))
		.sort();
	for (const file of files) {
		const sql = readFileSync(join(migrationsDir, file), "utf8");
		// executeMultiple runs the `;`-separated statements; drizzle's
		// `--> statement-breakpoint` markers are `--` line comments and ignored.
		await client.executeMultiple(sql);
	}
}

/**
 * Create a fresh in-memory database with all migrations applied.
 * Returns the drizzle instance plus the raw client (for teardown / raw SQL).
 */
export async function createTestDb(): Promise<{ db: TestDb; client: Client }> {
	const client = createClient({ url: ":memory:" });
	await applyMigrations(client);
	const db = drizzle(client, { schema });
	return { db, client };
}

import { db } from "@linkden/db";
import { siteSettings } from "@linkden/db/schema/index";
import type { BatchItem } from "drizzle-orm/batch";

/**
 * Build an atomic upsert statement for a single site setting. Single round-trip
 * (INSERT … ON CONFLICT DO UPDATE) so it can be composed into a db.batch().
 */
export function settingUpsertStmt(key: string, value: string) {
	return db
		.insert(siteSettings)
		.values({ key, value })
		.onConflictDoUpdate({ target: siteSettings.key, set: { value } });
}

/**
 * Upsert a single site setting (insert or update by key), atomically.
 */
export async function upsertSetting(key: string, value: string): Promise<void> {
	await settingUpsertStmt(key, value);
}

/**
 * Run a set of write statements in a single D1 transactional batch. A failure
 * in any statement rolls back the whole set. No-op for an empty list.
 */
export async function runBatch(stmts: BatchItem<"sqlite">[]): Promise<void> {
	if (stmts.length === 0) return;
	await db.batch(stmts as [BatchItem<"sqlite">, ...BatchItem<"sqlite">[]]);
}

/**
 * Load all site settings into a key-value map.
 */
export async function buildSettingsMap(): Promise<Record<string, string>> {
	const results = await db.select().from(siteSettings);
	const map: Record<string, string> = {};
	for (const row of results) {
		map[row.key] = row.value;
	}
	return map;
}

/**
 * Check if a setting value represents an enabled feature.
 */
export function isEnabled(settings: Record<string, string>, key: string): boolean {
	return settings[key] === "true";
}

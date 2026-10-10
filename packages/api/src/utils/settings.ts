import { db } from "@linkden/db";
import { siteSettings } from "@linkden/db/schema/index";
import { inArray } from "drizzle-orm";
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

/** Select site settings rows — every key, or only `keys` when given. */
export function settingsQuery(keys?: readonly string[]) {
	return db
		.select()
		.from(siteSettings)
		.where(keys ? inArray(siteSettings.key, [...keys]) : undefined);
}

/** Fold site_settings rows into a key-value map. */
export function toSettingsMap(
	rows: readonly { key: string; value: string }[],
): Record<string, string> {
	const map: Record<string, string> = {};
	for (const row of rows) {
		map[row.key] = row.value;
	}
	return map;
}

/**
 * Load site settings into a key-value map. Pass `keys` to read only what the
 * caller needs (public paths should never pull secret rows out of D1).
 */
export async function buildSettingsMap(keys?: readonly string[]): Promise<Record<string, string>> {
	return toSettingsMap(await settingsQuery(keys));
}

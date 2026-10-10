import { inArray } from "drizzle-orm";
import type { BaseSQLiteDatabase } from "drizzle-orm/sqlite-core";
import { siteSettings } from "./schema/settings";

// Structural type covering both the D1 (production) and libsql (test) drivers,
// regardless of the schema generic they were created with.
// biome-ignore lint/suspicious/noExplicitAny: driver-agnostic db handle
export type AnySqliteDb = BaseSQLiteDatabase<"async", any, any>;

/**
 * Read a handful of `site_settings` rows as a key → value map (missing keys are
 * absent). For packages that can't use the api's settings helpers, e.g. auth.
 */
export async function readSettings(
	db: AnySqliteDb,
	keys: readonly string[],
): Promise<Record<string, string>> {
	if (keys.length === 0) return {};
	const rows: { key: string; value: string }[] = await db
		.select({ key: siteSettings.key, value: siteSettings.value })
		.from(siteSettings)
		.where(inArray(siteSettings.key, [...keys]));
	const out: Record<string, string> = {};
	for (const row of rows) out[row.key] = row.value;
	return out;
}

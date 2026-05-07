import { db } from "@linkden/db";
import { siteSettings } from "@linkden/db/schema/index";
import { eq } from "drizzle-orm";

/**
 * Upsert a single site setting (insert or update by key).
 */
export async function upsertSetting(key: string, value: string): Promise<void> {
	const [existing] = await db.select().from(siteSettings).where(eq(siteSettings.key, key));
	if (existing) {
		await db.update(siteSettings).set({ value }).where(eq(siteSettings.key, key));
	} else {
		await db.insert(siteSettings).values({ key, value });
	}
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

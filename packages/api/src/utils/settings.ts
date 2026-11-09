import { db } from "@linkden/db";
import { siteSettings, user } from "@linkden/db/schema/index";
import { EMAIL_TRANSPORT_SETTING_KEYS, resolveEmailTransport } from "@linkden/email/transport";
import { isSecretKey, maskSecret, SECRET_MASK } from "@linkden/validators/settings-registry";
import { TRPCError } from "@trpc/server";
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

/** Validate explicit enablement against the settings that will survive this write. */
export async function assertMagicLinkAllowed(
	entries: ReadonlyArray<{ key: string; value: string }>,
	replace = false,
): Promise<void> {
	const changes = toSettingsMap(entries);
	if (changes.magic_link_enabled !== "true") return;
	const keys = replace
		? EMAIL_TRANSPORT_SETTING_KEYS.filter(isSecretKey)
		: EMAIL_TRANSPORT_SETTING_KEYS;
	const transport = resolveEmailTransport({ ...(await buildSettingsMap(keys)), ...changes });
	if (!transport || transport.apiKey === SECRET_MASK) {
		throw new TRPCError({
			code: "BAD_REQUEST",
			message: "Set up Resend with an API key and sender address before enabling magic links",
		});
	}
	const [admin] = await db.select({ twoFactorEnabled: user.twoFactorEnabled }).from(user).limit(1);
	if (admin?.twoFactorEnabled) {
		throw new TRPCError({
			code: "BAD_REQUEST",
			message: "Magic links can't be used while two-factor authentication is on",
		});
	}
}

/** Admin response projection; secrets are masked through the canonical registry. */
export async function buildMaskedSettingsMap(
	keys?: readonly string[],
): Promise<Record<string, string>> {
	return toSettingsMap(
		(await settingsQuery(keys)).map(({ key, value }) => ({ key, value: maskSecret(key, value) })),
	);
}

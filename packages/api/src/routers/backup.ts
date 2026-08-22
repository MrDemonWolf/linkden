import { db } from "@linkden/db";
import { block, contactSubmission, siteSettings, socialNetwork } from "@linkden/db/schema/index";
import {
	blockImportSchema,
	contactSubmissionImportSchema,
	socialNetworkImportSchema,
} from "@linkden/validators";
import {
	getSettingMeta,
	MAX_SETTING_VALUE_LENGTH,
	shouldBackup,
} from "@linkden/validators/settings-registry";
import { asc } from "drizzle-orm";
import type { BatchItem } from "drizzle-orm/batch";
import { z } from "zod";
import { protectedProcedure, router } from "../index";
import { logAudit } from "../utils/audit";
import { transformLinkStackData } from "../utils/linkstack-transformer";
import { runBatch, settingUpsertStmt } from "../utils/settings";
import { sanitizeSetting } from "./settings";

// ─── Backup Router ─────────────────────────────────────────────────────────
// Export format is versioned ("1.0") so future migrations can detect and upgrade
// older backups. Import supports two modes:
//   - "replace": wipes existing data before inserting (full restore)
//   - "merge": upserts by primary key, preserving data not in the backup
//
// Array size limits (.max(500)) prevent OOM from maliciously large payloads.
// Settings are capped at 100 entries with key/value length limits.

export const backupRouter = router({
	export: protectedProcedure.query(async () => {
		const blocks = await db.select().from(block).orderBy(asc(block.position));
		const settings = await db.select().from(siteSettings);
		const socials = await db.select().from(socialNetwork).orderBy(asc(socialNetwork.slug));
		const contacts = await db.select().from(contactSubmission);

		await logAudit("backup.export");
		return {
			version: "1.0",
			exportedAt: new Date().toISOString(),
			data: {
				blocks,
				// Secrets (API keys, signing certs) are excluded from backups —
				// credentials should never leave the database. See settings-registry.
				settings: settings.reduce(
					(acc, s) => {
						if (shouldBackup(s.key)) {
							acc[s.key] = s.value;
						}
						return acc;
					},
					{} as Record<string, string>,
				),
				socialNetworks: socials,
				contactSubmissions: contacts,
			},
		};
	}),

	import: protectedProcedure
		.input(
			z.object({
				mode: z.enum(["merge", "replace"]),
				data: z.object({
					blocks: z.array(blockImportSchema).max(500).optional(),
					settings: z
						.record(z.string().max(100), z.string().max(MAX_SETTING_VALUE_LENGTH))
						.optional(),
					socialNetworks: z.array(socialNetworkImportSchema).max(500).optional(),
					contactSubmissions: z.array(contactSubmissionImportSchema).max(500).optional(),
				}),
			}),
		)
		.mutation(async ({ input }) => {
			const { mode, data } = input;

			// Build the entire import as one transactional batch so a mid-import
			// failure can't leave a half-wiped / half-restored database. Merge uses
			// upsert semantics (no read-then-write), so both modes are atomic.
			const stmts: BatchItem<"sqlite">[] = [];
			let skippedSettings = 0;

			if (mode === "replace") {
				if (data.blocks) stmts.push(db.delete(block));
				if (data.settings) stmts.push(db.delete(siteSettings));
				if (data.socialNetworks) stmts.push(db.delete(socialNetwork));
				if (data.contactSubmissions) stmts.push(db.delete(contactSubmission));
			}

			if (data.blocks) {
				for (const b of data.blocks) {
					const values = b as typeof block.$inferInsert;
					stmts.push(
						db.insert(block).values(values).onConflictDoUpdate({ target: block.id, set: values }),
					);
				}
			}

			if (data.settings) {
				// Run the same registry-driven sanitization pipeline as settings.update —
				// otherwise a crafted backup can plant unvalidated values (e.g. a
				// non-#RRGGBB custom color that downstream inline styling relies on).
				// The registry (not the settings-router whitelist) is the gate so the
				// wallet/vcard keys that export writes round-trip. Sanitization happens
				// while building the batch; the writes still land atomically below.
				for (const [key, value] of Object.entries(data.settings)) {
					if (!getSettingMeta(key)) {
						skippedSettings++;
						continue;
					}
					try {
						stmts.push(settingUpsertStmt(key, sanitizeSetting(key, value)));
					} catch {
						// Unknown key or value failed validation (bad URL/color/enum/…) —
						// skip it rather than aborting the whole restore.
						skippedSettings++;
					}
				}
			}

			if (data.socialNetworks) {
				for (const s of data.socialNetworks) {
					const url = s.url || "";
					if (!url) continue;
					const isActive = s.isActive ?? true;
					stmts.push(
						db
							.insert(socialNetwork)
							.values({ slug: s.slug, url, isActive })
							.onConflictDoUpdate({ target: socialNetwork.slug, set: { url, isActive } }),
					);
				}
			}

			if (data.contactSubmissions) {
				for (const c of data.contactSubmissions) {
					const values = c as typeof contactSubmission.$inferInsert;
					// merge keeps existing rows; replace already cleared the table.
					stmts.push(db.insert(contactSubmission).values(values).onConflictDoNothing());
				}
			}

			await runBatch(stmts);
			if (skippedSettings > 0) {
				await logAudit("backup.import.skipped_settings", undefined, undefined, {
					count: skippedSettings,
				});
			}
			await logAudit("backup.import", undefined, undefined, { mode });
			return { success: true };
		}),

	importLinkStack: protectedProcedure
		.input(
			z.object({
				// LinkStack's export is untrusted JSON: bound every string, cap the link list.
				data: z.object({
					name: z.string().max(100).optional(),
					littlelink_name: z.string().max(100).optional(),
					littlelink_description: z.string().max(1000).optional(),
					theme: z.string().max(2000).optional(),
					profile_image: z.string().max(2048).optional(),
					links: z
						.array(
							z.object({
								button_id: z.string().max(100).optional(),
								link: z.string().max(2048).optional(),
								title: z.string().max(200).optional(),
								order: z.number().optional(),
								click_number: z.number().optional(),
								custom_css: z.string().max(5000).optional(),
								custom_icon: z.string().max(200).optional(),
								type: z.number().optional(),
								type_params: z.string().max(2000).optional(),
							}),
						)
						.max(500)
						.optional(),
				}),
				options: z.object({
					importLinks: z.boolean(),
					importProfile: z.boolean(),
					importTheme: z.boolean(),
				}),
			}),
		)
		.mutation(async ({ input }) => {
			const { data, options } = input;
			const transformed = transformLinkStackData(data);

			let linksImported = 0;
			let settingsUpdated = false;
			const stmts: BatchItem<"sqlite">[] = [];

			if (options.importLinks && transformed.blocks.length > 0) {
				for (const b of transformed.blocks) {
					stmts.push(db.insert(block).values(b));
				}
				linksImported = transformed.blocks.length;
			}

			if (options.importProfile || options.importTheme) {
				const settingsToImport: Record<string, string> = {};

				if (options.importProfile) {
					if (transformed.settings.display_name) {
						settingsToImport.profile_name = transformed.settings.display_name;
					}
					if (transformed.settings.bio) {
						settingsToImport.bio = transformed.settings.bio;
					}
				}

				if (options.importTheme && transformed.settings.theme) {
					settingsToImport.theme = transformed.settings.theme;
				}

				for (const [key, value] of Object.entries(settingsToImport)) {
					stmts.push(settingUpsertStmt(key, sanitizeSetting(key, value)));
				}

				if (Object.keys(settingsToImport).length > 0) {
					settingsUpdated = true;
				}
			}

			await runBatch(stmts);

			return {
				success: true,
				stats: { linksImported, settingsUpdated },
			};
		}),
});

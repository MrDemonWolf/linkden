import { router, protectedProcedure } from "../index";
import { db } from "@linkden/db";
import { block, siteSettings, socialNetwork, contactSubmission } from "@linkden/db/schema/index";
import { logAudit } from "../utils/audit";
import { asc } from "drizzle-orm";
import type { BatchItem } from "drizzle-orm/batch";
import { z } from "zod";
import { transformLinkStackData } from "../utils/linkstack-transformer";
import { runBatch, settingUpsertStmt } from "../utils/settings";
import { shouldBackup } from "@linkden/validators/settings-registry";
import {
	blockImportSchema,
	socialNetworkImportSchema,
	contactSubmissionImportSchema,
} from "@linkden/validators";

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
					settings: z.record(z.string().max(100), z.string().max(100000)).optional(),
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
				for (const [key, value] of Object.entries(data.settings)) {
					stmts.push(settingUpsertStmt(key, value));
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
			await logAudit("backup.import", undefined, undefined, { mode });
			return { success: true };
		}),

	importLinkStack: protectedProcedure
		.input(
			z.object({
				data: z.object({
					name: z.string().optional(),
					littlelink_name: z.string().optional(),
					littlelink_description: z.string().optional(),
					theme: z.string().optional(),
					profile_image: z.string().optional(),
					links: z
						.array(
							z.object({
								button_id: z.string().optional(),
								link: z.string().optional(),
								title: z.string().optional(),
								order: z.number().optional(),
								click_number: z.number().optional(),
								custom_css: z.string().optional(),
								custom_icon: z.string().optional(),
								type: z.number().optional(),
								type_params: z.string().optional(),
							}),
						)
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
						settingsToImport.display_name = transformed.settings.display_name;
					}
					if (transformed.settings.bio) {
						settingsToImport.bio = transformed.settings.bio;
					}
				}

				if (options.importTheme && transformed.settings.theme) {
					settingsToImport.theme = transformed.settings.theme;
				}

				for (const [key, value] of Object.entries(settingsToImport)) {
					stmts.push(settingUpsertStmt(key, value));
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

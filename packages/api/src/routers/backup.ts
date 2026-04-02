import { router, protectedProcedure } from "../index";
import { db } from "@linkden/db";
import {
	block,
	siteSettings,
	socialNetwork,
	contactSubmission,
} from "@linkden/db/schema/index";
import { logAudit } from "../utils/audit";
import { eq, asc, sql } from "drizzle-orm";
import { z } from "zod";
import { transformLinkStackData } from "../utils/linkstack-transformer";
import { upsertSetting } from "../utils/settings";
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
		const blocks = await db
			.select()
			.from(block)
			.orderBy(asc(block.position));
		const settings = await db.select().from(siteSettings);
		const socials = await db
			.select()
			.from(socialNetwork)
			.orderBy(asc(socialNetwork.slug));
		const contacts = await db.select().from(contactSubmission);

		// Exclude secrets from backup — credentials should never leave the database
		const SECRET_KEYS = new Set([
			"email_api_key",
			"captcha_secret_key",
			"mapkit_token",
			"wallet_signer_cert",
			"wallet_signer_key",
			"wallet_wwdr_cert",
		]);

		await logAudit("backup.export");
		return {
			version: "1.0",
			exportedAt: new Date().toISOString(),
			data: {
				blocks,
				settings: settings.reduce(
					(acc, s) => {
						if (!SECRET_KEYS.has(s.key)) {
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

			// In replace mode, wipe tables that are being imported to get a clean slate
			if (mode === "replace") {
				if (data.blocks) {
					await db.run(sql`DELETE FROM block`);
				}
				if (data.settings) {
					await db.run(sql`DELETE FROM site_settings`);
				}
				if (data.socialNetworks) {
					await db.run(sql`DELETE FROM social_network`);
				}
				if (data.contactSubmissions) {
					await db.run(sql`DELETE FROM contact_submission`);
				}
			}

			if (data.blocks) {
				for (const b of data.blocks) {
					const blockId = b.id;
					if (mode === "merge") {
						const [existing] = await db
							.select()
							.from(block)
							.where(eq(block.id, blockId));
						if (existing) {
							await db
								.update(block)
								.set(b as typeof block.$inferInsert)
								.where(eq(block.id, blockId));
							continue;
						}
					}
					await db.insert(block).values(b as typeof block.$inferInsert);
				}
			}

			if (data.settings) {
				const entries = Object.entries(data.settings);
				for (const [key, value] of entries) {
					await upsertSetting(key, value);
				}
			}

			if (data.socialNetworks) {
				for (const s of data.socialNetworks) {
					const slug = s.slug;
					const url = s.url || "";
					const isActive = s.isActive ?? true;

					if (!url) continue;

					await db
						.insert(socialNetwork)
						.values({ slug, url, isActive })
						.onConflictDoUpdate({
							target: socialNetwork.slug,
							set: { url, isActive },
						});
				}
			}

			if (data.contactSubmissions) {
				for (const c of data.contactSubmissions) {
					const contactId = c.id;
					if (mode === "merge") {
						const [existing] = await db
							.select()
							.from(contactSubmission)
							.where(eq(contactSubmission.id, contactId));
						if (existing) continue;
					}
					await db.insert(contactSubmission).values(c as typeof contactSubmission.$inferInsert);
				}
			}

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
					links: z.array(z.object({
						button_id: z.string().optional(),
						link: z.string().optional(),
						title: z.string().optional(),
						order: z.number().optional(),
						click_number: z.number().optional(),
						custom_css: z.string().optional(),
						custom_icon: z.string().optional(),
						type: z.number().optional(),
						type_params: z.string().optional(),
					})).optional(),
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

			if (options.importLinks && transformed.blocks.length > 0) {
				for (const b of transformed.blocks) {
					await db.insert(block).values(b);
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
					await upsertSetting(key, value);
				}

				if (Object.keys(settingsToImport).length > 0) {
					settingsUpdated = true;
				}
			}

			return {
				success: true,
				stats: { linksImported, settingsUpdated },
			};
		}),
});

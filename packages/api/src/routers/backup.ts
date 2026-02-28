import { router, protectedProcedure } from "../index";
import { db } from "@linkden/db";
import {
	block,
	siteSettings,
	socialNetwork,
	contactSubmission,
} from "@linkden/db/schema/index";
import { eq, asc, sql } from "drizzle-orm";
import { z } from "zod";
import { transformLinkStackData } from "../utils/linkstack-transformer";

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

		return {
			version: "1.0",
			exportedAt: new Date().toISOString(),
			data: {
				blocks,
				settings: settings.reduce(
					(acc, s) => {
						acc[s.key] = s.value;
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
					blocks: z.array(z.any()).optional(),
					settings: z.record(z.string(), z.string()).optional(),
					socialNetworks: z.array(z.any()).optional(),
					contactSubmissions: z.array(z.any()).optional(),
				}),
			}),
		)
		.mutation(async ({ input }) => {
			const { mode, data } = input;

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
				for (const b of data.blocks as Record<string, unknown>[]) {
					const blockId = b.id as string;
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
				const entries = Object.entries(data.settings) as [string, string][];
				for (const [key, value] of entries) {
					const [existing] = await db
						.select()
						.from(siteSettings)
						.where(eq(siteSettings.key, key));
					if (existing) {
						await db
							.update(siteSettings)
							.set({ value })
							.where(eq(siteSettings.key, key));
					} else {
						await db.insert(siteSettings).values({ key, value });
					}
				}
			}

			if (data.socialNetworks) {
				for (const s of data.socialNetworks as Record<string, unknown>[]) {
					const slug = s.slug as string;
					const url = (s.url as string) || "";
					const isActive = (s.isActive as boolean) ?? (s.is_active as boolean) ?? true;

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
				for (const c of data.contactSubmissions as Record<string, unknown>[]) {
					const contactId = c.id as string;
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

			return { success: true };
		}),

	importLinkStack: protectedProcedure
		.input(
			z.object({
				data: z.any(),
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
					const [existing] = await db
						.select()
						.from(siteSettings)
						.where(eq(siteSettings.key, key));
					if (existing) {
						await db
							.update(siteSettings)
							.set({ value })
							.where(eq(siteSettings.key, key));
					} else {
						await db.insert(siteSettings).values({ key, value });
					}
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

import { router, protectedProcedure } from "../index";
import { db } from "@linkden/db";
import { siteSettings } from "@linkden/db/schema/index";
import { eq } from "drizzle-orm";
import { z } from "zod";

export const settingsRouter = router({
	get: protectedProcedure
		.input(z.object({ key: z.string() }))
		.query(async ({ input }) => {
			const [result] = await db
				.select()
				.from(siteSettings)
				.where(eq(siteSettings.key, input.key));
			return result ?? null;
		}),

	getAll: protectedProcedure.query(async () => {
		const results = await db.select().from(siteSettings);
		const map: Record<string, string> = {};
		for (const row of results) {
			map[row.key] = row.value;
		}
		return map;
	}),

	update: protectedProcedure
		.input(
			z.object({
				key: z.string(),
				value: z.string(),
			}),
		)
		.mutation(async ({ input }) => {
			const [existing] = await db
				.select()
				.from(siteSettings)
				.where(eq(siteSettings.key, input.key));

			if (existing) {
				await db
					.update(siteSettings)
					.set({ value: input.value })
					.where(eq(siteSettings.key, input.key));
			} else {
				await db.insert(siteSettings).values({
					key: input.key,
					value: input.value,
				});
			}
			return { success: true };
		}),

	updateBulk: protectedProcedure
		.input(z.array(z.object({ key: z.string(), value: z.string() })))
		.mutation(async ({ input }) => {
			for (const { key, value } of input) {
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
			return { success: true };
		}),
});

import { router, protectedProcedure } from "../index";
import { db } from "@linkden/db";
import { socialNetwork } from "@linkden/db/schema/index";
import { eq, asc } from "drizzle-orm";
import { z } from "zod";

export const socialRouter = router({
	list: protectedProcedure
		.input(
			z
				.object({
					activeOnly: z.boolean().default(false),
				})
				.optional(),
		)
		.query(async ({ input }) => {
			const results = input?.activeOnly
				? await db
						.select()
						.from(socialNetwork)
						.where(eq(socialNetwork.isActive, true))
						.orderBy(asc(socialNetwork.slug))
				: await db
						.select()
						.from(socialNetwork)
						.orderBy(asc(socialNetwork.slug));

			return results;
		}),

	updateBulk: protectedProcedure
		.input(
			z.array(
				z.object({
					slug: z.string(),
					url: z.string(),
					isActive: z.boolean(),
				}),
			),
		)
		.mutation(async ({ input }) => {
			for (const item of input) {
				if (item.isActive && item.url) {
					// Upsert: insert or update
					await db
						.insert(socialNetwork)
						.values({
							slug: item.slug,
							url: item.url,
							isActive: item.isActive,
						})
						.onConflictDoUpdate({
							target: socialNetwork.slug,
							set: {
								url: item.url,
								isActive: item.isActive,
							},
						});
				} else {
					// Deactivating or clearing — delete the row if it exists
					await db
						.delete(socialNetwork)
						.where(eq(socialNetwork.slug, item.slug));
				}
			}
			return { success: true };
		}),
});

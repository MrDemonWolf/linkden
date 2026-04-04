import { router, protectedProcedure } from "../index";
import { db } from "@linkden/db";
import { socialNetwork } from "@linkden/db/schema/index";
import { eq, asc } from "drizzle-orm";
import { z } from "zod";
import { sanitizeUrl } from "../utils/sanitize";

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
					url: z.string().url().max(2048),
					isActive: z.boolean(),
				}),
			).max(50),
		)
		.mutation(async ({ input }) => {
			for (const item of input) {
				const safeUrl = sanitizeUrl(item.url);
				if (safeUrl) {
					// Upsert: insert or update (persist row even if inactive, so URL isn't lost)
					await db
						.insert(socialNetwork)
						.values({
							slug: item.slug,
							url: safeUrl,
							isActive: item.isActive,
						})
						.onConflictDoUpdate({
							target: socialNetwork.slug,
							set: {
								url: safeUrl,
								isActive: item.isActive,
							},
						});
				} else {
					// No URL — delete the row if it exists
					await db
						.delete(socialNetwork)
						.where(eq(socialNetwork.slug, item.slug));
				}
			}
			return { success: true };
		}),
});

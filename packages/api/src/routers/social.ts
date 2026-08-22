import { db } from "@linkden/db";
import { socialNetwork } from "@linkden/db/schema/index";
import { updateSocialSchema } from "@linkden/validators/social";
import { asc, eq } from "drizzle-orm";
import { z } from "zod";
import { protectedProcedure, router } from "../index";
import { runBatch } from "../utils/settings";

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
				: await db.select().from(socialNetwork).orderBy(asc(socialNetwork.slug));

			return results;
		}),

	updateBulk: protectedProcedure.input(updateSocialSchema).mutation(async ({ input }) => {
		// Slug + http(s) URL are enforced by the schema. An empty URL clears the
		// network; otherwise upsert so an inactive row keeps its URL. All writes
		// land in one atomic batch.
		await runBatch(
			input.map(({ slug, url, isActive }) =>
				url
					? db
							.insert(socialNetwork)
							.values({ slug, url, isActive })
							.onConflictDoUpdate({ target: socialNetwork.slug, set: { url, isActive } })
					: db.delete(socialNetwork).where(eq(socialNetwork.slug, slug)),
			),
		);
		return { success: true };
	}),
});

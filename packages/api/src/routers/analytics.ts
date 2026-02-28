import { router, protectedProcedure } from "../index";
import { db } from "@linkden/db";
import { pageView, linkClick, block } from "@linkden/db/schema/index";
import { eq, gte, lte, and, desc, sql, count } from "drizzle-orm";
import { z } from "zod";

function getDateRange(period: string) {
	const end = new Date();
	const start = new Date();
	switch (period) {
		case "7d":
			start.setDate(start.getDate() - 7);
			break;
		case "30d":
			start.setDate(start.getDate() - 30);
			break;
		case "90d":
			start.setDate(start.getDate() - 90);
			break;
		default:
			start.setDate(start.getDate() - 7);
	}
	return { start, end };
}

const rangeInput = z
	.object({
		period: z.enum(["7d", "30d", "90d"]).default("7d"),
		startDate: z.date().optional(),
		endDate: z.date().optional(),
	})
	.optional();

export const analyticsRouter = router({
	overview: protectedProcedure.input(rangeInput).query(async ({ input }) => {
		const { start, end } =
			input?.startDate && input?.endDate
				? { start: input.startDate, end: input.endDate }
				: getDateRange(input?.period ?? "7d");

		const views = await db
			.select({ count: count() })
			.from(pageView)
			.where(
				and(gte(pageView.createdAt, start), lte(pageView.createdAt, end)),
			);

		const clicks = await db
			.select({ count: count() })
			.from(linkClick)
			.where(
				and(gte(linkClick.createdAt, start), lte(linkClick.createdAt, end)),
			);

		return {
			totalViews: views[0]?.count ?? 0,
			totalClicks: clicks[0]?.count ?? 0,
		};
	}),

	viewsOverTime: protectedProcedure
		.input(rangeInput)
		.query(async ({ input }) => {
			const { start, end } =
				input?.startDate && input?.endDate
					? { start: input.startDate, end: input.endDate }
					: getDateRange(input?.period ?? "7d");

			const results = await db
				.select({
					date: sql<string>`date(${pageView.createdAt} / 1000, 'unixepoch')`,
					count: count(),
				})
				.from(pageView)
				.where(
					and(gte(pageView.createdAt, start), lte(pageView.createdAt, end)),
				)
				.groupBy(
					sql`date(${pageView.createdAt} / 1000, 'unixepoch')`,
				)
				.orderBy(
					sql`date(${pageView.createdAt} / 1000, 'unixepoch')`,
				);

			return results;
		}),

	clicksOverTime: protectedProcedure
		.input(rangeInput)
		.query(async ({ input }) => {
			const { start, end } =
				input?.startDate && input?.endDate
					? { start: input.startDate, end: input.endDate }
					: getDateRange(input?.period ?? "7d");

			const results = await db
				.select({
					date: sql<string>`date(${linkClick.createdAt} / 1000, 'unixepoch')`,
					count: count(),
				})
				.from(linkClick)
				.where(
					and(gte(linkClick.createdAt, start), lte(linkClick.createdAt, end)),
				)
				.groupBy(
					sql`date(${linkClick.createdAt} / 1000, 'unixepoch')`,
				)
				.orderBy(
					sql`date(${linkClick.createdAt} / 1000, 'unixepoch')`,
				);

			return results;
		}),

	topLinks: protectedProcedure.input(rangeInput).query(async ({ input }) => {
		const { start, end } =
			input?.startDate && input?.endDate
				? { start: input.startDate, end: input.endDate }
				: getDateRange(input?.period ?? "7d");

		const results = await db
			.select({
				blockId: linkClick.blockId,
				blockTitle: block.title,
				blockUrl: block.url,
				count: count(),
			})
			.from(linkClick)
			.leftJoin(block, eq(linkClick.blockId, block.id))
			.where(
				and(gte(linkClick.createdAt, start), lte(linkClick.createdAt, end)),
			)
			.groupBy(linkClick.blockId, block.title, block.url)
			.orderBy(desc(count()))
			.limit(10);

		return results;
	}),

	referrers: protectedProcedure.input(rangeInput).query(async ({ input }) => {
		const { start, end } =
			input?.startDate && input?.endDate
				? { start: input.startDate, end: input.endDate }
				: getDateRange(input?.period ?? "7d");

		const results = await db
			.select({
				referrer: pageView.referrer,
				count: count(),
			})
			.from(pageView)
			.where(
				and(
					gte(pageView.createdAt, start),
					lte(pageView.createdAt, end),
					sql`${pageView.referrer} IS NOT NULL AND ${pageView.referrer} != ''`,
				),
			)
			.groupBy(pageView.referrer)
			.orderBy(desc(count()))
			.limit(10);

		return results;
	}),

	countries: protectedProcedure.input(rangeInput).query(async ({ input }) => {
		const { start, end } =
			input?.startDate && input?.endDate
				? { start: input.startDate, end: input.endDate }
				: getDateRange(input?.period ?? "7d");

		const results = await db
			.select({
				country: pageView.country,
				count: count(),
			})
			.from(pageView)
			.where(
				and(
					gte(pageView.createdAt, start),
					lte(pageView.createdAt, end),
					sql`${pageView.country} IS NOT NULL AND ${pageView.country} != ''`,
				),
			)
			.groupBy(pageView.country)
			.orderBy(desc(count()))
			.limit(20);

		return results;
	}),
});

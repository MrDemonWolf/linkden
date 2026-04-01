import { router, protectedProcedure } from "../index";
import { db } from "@linkden/db";
import { pageView, linkClick, block, contactSubmission } from "@linkden/db/schema/index";
import { eq, gte, lte, and, desc, sql, count } from "drizzle-orm";
import type { SQLWrapper } from "drizzle-orm";
import { z } from "zod";

function getDateRange(period: string): { start: Date | null; end: Date } {
	const end = new Date();
	if (period === "all") {
		return { start: null, end };
	}
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

/** Build a where clause array for a date column, handling null start (all time). */
function dateWhere(col: SQLWrapper, start: Date | null, end: Date): (SQLWrapper | undefined)[] {
	if (start === null) {
		return [lte(col, end)];
	}
	return [gte(col, start), lte(col, end)];
}

const rangeInput = z
	.object({
		period: z.enum(["7d", "30d", "90d", "all"]).default("7d"),
		startDate: z.date().optional(),
		endDate: z.date().optional(),
	})
	.optional();

export const analyticsRouter = router({
	overview: protectedProcedure.input(rangeInput).query(async ({ input }) => {
		const { start, end } =
			input?.startDate && input?.endDate
				? { start: input.startDate as Date | null, end: input.endDate }
				: getDateRange(input?.period ?? "7d");

		// Compute previous period window for comparison (skip for "all time")
		const hasPrevious = start !== null;
		const periodMs = hasPrevious ? end.getTime() - start.getTime() : 0;
		const prevEnd = hasPrevious ? new Date(start.getTime()) : new Date(0);
		const prevStart = hasPrevious ? new Date(start.getTime() - periodMs) : new Date(0);

		const [views, clicks, prevViews, prevClicks, activeLinksResult, contactsResult] = await Promise.all([
			db
				.select({ count: count() })
				.from(pageView)
				.where(and(...dateWhere(pageView.createdAt, start, end))),
			db
				.select({ count: count() })
				.from(linkClick)
				.where(and(...dateWhere(linkClick.createdAt, start, end))),
			hasPrevious
				? db
						.select({ count: count() })
						.from(pageView)
						.where(
							and(gte(pageView.createdAt, prevStart), lte(pageView.createdAt, prevEnd)),
						)
				: Promise.resolve([{ count: 0 }]),
			hasPrevious
				? db
						.select({ count: count() })
						.from(linkClick)
						.where(
							and(gte(linkClick.createdAt, prevStart), lte(linkClick.createdAt, prevEnd)),
						)
				: Promise.resolve([{ count: 0 }]),
			db
				.select({ count: count() })
				.from(block)
				.where(and(eq(block.isEnabled, true), eq(block.status, "published"))),
			db
				.select({ count: count() })
				.from(contactSubmission)
				.where(and(...dateWhere(contactSubmission.createdAt, start, end))),
		]);

		return {
			totalViews: views[0]?.count ?? 0,
			totalClicks: clicks[0]?.count ?? 0,
			previousViews: prevViews[0]?.count ?? 0,
			previousClicks: prevClicks[0]?.count ?? 0,
			activeLinks: activeLinksResult[0]?.count ?? 0,
			totalConnections: contactsResult[0]?.count ?? 0,
		};
	}),

	viewsOverTime: protectedProcedure
		.input(rangeInput)
		.query(async ({ input }) => {
			const { start, end } =
				input?.startDate && input?.endDate
					? { start: input.startDate as Date | null, end: input.endDate }
					: getDateRange(input?.period ?? "7d");

			const results = await db
				.select({
					date: sql<string>`date(${pageView.createdAt} / 1000, 'unixepoch')`,
					count: count(),
				})
				.from(pageView)
				.where(and(...dateWhere(pageView.createdAt, start, end)))
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
					? { start: input.startDate as Date | null, end: input.endDate }
					: getDateRange(input?.period ?? "7d");

			const results = await db
				.select({
					date: sql<string>`date(${linkClick.createdAt} / 1000, 'unixepoch')`,
					count: count(),
				})
				.from(linkClick)
				.where(and(...dateWhere(linkClick.createdAt, start, end)))
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
				? { start: input.startDate as Date | null, end: input.endDate }
				: getDateRange(input?.period ?? "7d");

		const results = await db
			.select({
				id: linkClick.blockId,
				title: block.title,
				url: block.url,
				clicks: count(),
			})
			.from(linkClick)
			.leftJoin(block, eq(linkClick.blockId, block.id))
			.where(and(...dateWhere(linkClick.createdAt, start, end)))
			.groupBy(linkClick.blockId, block.title, block.url)
			.orderBy(desc(count()))
			.limit(10);

		return results;
	}),

	recentClicks: protectedProcedure.query(async () => {
		const results = await db
			.select({
				id: linkClick.id,
				createdAt: linkClick.createdAt,
				country: linkClick.country,
				title: block.title,
				url: block.url,
			})
			.from(linkClick)
			.leftJoin(block, eq(linkClick.blockId, block.id))
			.orderBy(desc(linkClick.createdAt))
			.limit(6);
		return results;
	}),

	referrers: protectedProcedure.input(rangeInput).query(async ({ input }) => {
		const { start, end } =
			input?.startDate && input?.endDate
				? { start: input.startDate as Date | null, end: input.endDate }
				: getDateRange(input?.period ?? "7d");

		const dateConditions = dateWhere(pageView.createdAt, start, end);

		const results = await db
			.select({
				referrer: pageView.referrer,
				count: count(),
			})
			.from(pageView)
			.where(
				and(
					...dateConditions,
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
				? { start: input.startDate as Date | null, end: input.endDate }
				: getDateRange(input?.period ?? "7d");

		const dateConditions = dateWhere(pageView.createdAt, start, end);

		const results = await db
			.select({
				country: pageView.country,
				count: count(),
			})
			.from(pageView)
			.where(
				and(
					...dateConditions,
					sql`${pageView.country} IS NOT NULL AND ${pageView.country} != ''`,
				),
			)
			.groupBy(pageView.country)
			.orderBy(desc(count()))
			.limit(20);

		return results;
	}),

	purgeExpiredData: protectedProcedure.mutation(async () => {
		const ninetyDaysAgo = new Date();
		ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

		const [deletedViews, deletedClicks] = await Promise.all([
			db.delete(pageView).where(lte(pageView.createdAt, ninetyDaysAgo)),
			db.delete(linkClick).where(lte(linkClick.createdAt, ninetyDaysAgo)),
		]);

		return {
			success: true,
			deleted: {
				pageViews: (deletedViews as { rowsAffected?: number }).rowsAffected ?? 0,
				linkClicks: (deletedClicks as { rowsAffected?: number }).rowsAffected ?? 0,
			},
		};
	}),
});

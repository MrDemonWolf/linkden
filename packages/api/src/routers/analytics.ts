import { db } from "@linkden/db";
import { block, contactSubmission, linkClick, pageView } from "@linkden/db/schema/index";
import type { SQLWrapper } from "drizzle-orm";
import { and, count, desc, eq, gte, lte, sql } from "drizzle-orm";
import { z } from "zod";
import { protectedProcedure, router } from "../index";
import { buildSettingsMap } from "../utils/settings";
import { localDaySql, utcOffsetMinutes } from "../utils/timezone";

export const ANALYTICS_PERIODS = ["7d", "30d", "90d", "all"] as const;
type Period = (typeof ANALYTICS_PERIODS)[number];

const PERIOD_DAYS: Record<Exclude<Period, "all">, number> = { "7d": 7, "30d": 30, "90d": 90 };

/** The window a period covers, ending now. `start` is null for all time. */
export function getDateRange(
	period: Period,
	now: Date = new Date(),
): {
	start: Date | null;
	end: Date;
} {
	if (period === "all") return { start: null, end: now };
	const start = new Date(now);
	start.setDate(start.getDate() - PERIOD_DAYS[period]);
	return { start, end: now };
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
		period: z.enum(ANALYTICS_PERIODS).default("7d"),
	})
	.optional();

/**
 * Current UTC offset of the admin's `timezone` setting (UTC when unset/invalid),
 * so daily buckets follow the admin's calendar day rather than UTC's. The
 * current offset is applied across the range; a DST change inside it shifts at
 * most the hour around the switch.
 */
async function adminUtcOffset(now: Date): Promise<number> {
	const { timezone } = await buildSettingsMap(["timezone"]);
	return utcOffsetMinutes(timezone, now);
}

export const analyticsRouter = router({
	overview: protectedProcedure.input(rangeInput).query(async ({ input }) => {
		const { start, end } = getDateRange(input?.period ?? "7d");

		// Compute previous period window for comparison (skip for "all time")
		const hasPrevious = start !== null;
		const periodMs = hasPrevious ? end.getTime() - start.getTime() : 0;
		const prevEnd = hasPrevious ? new Date(start.getTime()) : new Date(0);
		const prevStart = hasPrevious ? new Date(start.getTime() - periodMs) : new Date(0);

		const [views, clicks, prevViews, prevClicks, activeLinksResult, contactsResult] =
			await Promise.all([
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
							.where(and(gte(pageView.createdAt, prevStart), lte(pageView.createdAt, prevEnd)))
					: Promise.resolve([{ count: 0 }]),
				hasPrevious
					? db
							.select({ count: count() })
							.from(linkClick)
							.where(and(gte(linkClick.createdAt, prevStart), lte(linkClick.createdAt, prevEnd)))
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

	// Buckets are calendar days (YYYY-MM-DD) in the admin's `timezone` setting.
	// Label them from their Y-M-D parts, never via `new Date("YYYY-MM-DD")`
	// (that parses as UTC midnight and shifts a day west of UTC).
	viewsOverTime: protectedProcedure.input(rangeInput).query(async ({ input }) => {
		const now = new Date();
		const { start, end } = getDateRange(input?.period ?? "7d", now);
		const day = localDaySql(pageView.createdAt, await adminUtcOffset(now));

		return db
			.select({ date: day, count: count() })
			.from(pageView)
			.where(and(...dateWhere(pageView.createdAt, start, end)))
			.groupBy(day)
			.orderBy(day);
	}),

	clicksOverTime: protectedProcedure.input(rangeInput).query(async ({ input }) => {
		const now = new Date();
		const { start, end } = getDateRange(input?.period ?? "7d", now);
		const day = localDaySql(linkClick.createdAt, await adminUtcOffset(now));

		return db
			.select({ date: day, count: count() })
			.from(linkClick)
			.where(and(...dateWhere(linkClick.createdAt, start, end)))
			.groupBy(day)
			.orderBy(day);
	}),

	topLinks: protectedProcedure.input(rangeInput).query(async ({ input }) => {
		const { start, end } = getDateRange(input?.period ?? "7d");

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

	referrers: protectedProcedure.input(rangeInput).query(async ({ input }) => {
		const { start, end } = getDateRange(input?.period ?? "7d");

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
		const { start, end } = getDateRange(input?.period ?? "7d");

		const dateConditions = dateWhere(pageView.createdAt, start, end);

		const results = await db
			.select({
				country: pageView.country,
				count: count(),
			})
			.from(pageView)
			.where(
				and(...dateConditions, sql`${pageView.country} IS NOT NULL AND ${pageView.country} != ''`),
			)
			.groupBy(pageView.country)
			.orderBy(desc(count()))
			.limit(20);

		return results;
	}),
});

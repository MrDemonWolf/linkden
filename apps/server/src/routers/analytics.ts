import { z } from "zod";
import { eq, sql, and, gte, count, desc } from "drizzle-orm";
import { analytics, links } from "@linkden/db/schema";
import { AnalyticsQuerySchema } from "@linkden/validators";
import { router, protectedProcedure } from "../trpc";

function periodToDate(period: "7d" | "30d" | "90d"): string {
  const days = period === "7d" ? 7 : period === "30d" ? 30 : 90;
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString();
}

export const analyticsRouter = router({
  /** Overview: total views, clicks, CTR for period */
  overview: protectedProcedure
    .input(AnalyticsQuerySchema)
    .query(async ({ ctx, input }) => {
      const since = periodToDate(input.period);

      const [views] = await ctx.db
        .select({ count: count() })
        .from(analytics)
        .where(
          and(
            eq(analytics.event, "page_view"),
            gte(analytics.createdAt, since)
          )
        );

      const [clicks] = await ctx.db
        .select({ count: count() })
        .from(analytics)
        .where(
          and(
            eq(analytics.event, "link_click"),
            gte(analytics.createdAt, since)
          )
        );

      const totalViews = views?.count ?? 0;
      const totalClicks = clicks?.count ?? 0;
      const ctr = totalViews > 0 ? (totalClicks / totalViews) * 100 : 0;

      return {
        totalViews,
        totalClicks,
        ctr: Math.round(ctr * 100) / 100,
        period: input.period,
      };
    }),

  /** Time series: daily counts for period */
  timeSeries: protectedProcedure
    .input(AnalyticsQuerySchema)
    .query(async ({ ctx, input }) => {
      const since = periodToDate(input.period);

      const rows = await ctx.db
        .select({
          date: sql<string>`date(${analytics.createdAt})`.as("date"),
          event: analytics.event,
          count: count(),
        })
        .from(analytics)
        .where(gte(analytics.createdAt, since))
        .groupBy(sql`date(${analytics.createdAt})`, analytics.event)
        .orderBy(sql`date(${analytics.createdAt})`);

      return rows;
    }),

  /** Clicks per link */
  byLink: protectedProcedure
    .input(AnalyticsQuerySchema)
    .query(async ({ ctx, input }) => {
      const since = periodToDate(input.period);

      const rows = await ctx.db
        .select({
          linkId: analytics.linkId,
          title: links.title,
          url: links.url,
          clicks: count(),
        })
        .from(analytics)
        .leftJoin(links, eq(analytics.linkId, links.id))
        .where(
          and(
            eq(analytics.event, "link_click"),
            gte(analytics.createdAt, since)
          )
        )
        .groupBy(analytics.linkId, links.title, links.url)
        .orderBy(desc(count()));

      return rows;
    }),

  /** Top referrer domains */
  topReferrers: protectedProcedure
    .input(AnalyticsQuerySchema)
    .query(async ({ ctx, input }) => {
      const since = periodToDate(input.period);

      const rows = await ctx.db
        .select({
          referrer: analytics.referrer,
          count: count(),
        })
        .from(analytics)
        .where(
          and(
            gte(analytics.createdAt, since),
            sql`${analytics.referrer} != ''`
          )
        )
        .groupBy(analytics.referrer)
        .orderBy(desc(count()))
        .limit(20);

      return rows;
    }),

  /** Country breakdown */
  countries: protectedProcedure
    .input(AnalyticsQuerySchema)
    .query(async ({ ctx, input }) => {
      const since = periodToDate(input.period);

      const rows = await ctx.db
        .select({
          country: analytics.country,
          count: count(),
        })
        .from(analytics)
        .where(
          and(
            gte(analytics.createdAt, since),
            sql`${analytics.country} != ''`
          )
        )
        .groupBy(analytics.country)
        .orderBy(desc(count()));

      return rows;
    }),

  /** Delete all analytics */
  clear: protectedProcedure.mutation(async ({ ctx }) => {
    await ctx.db.delete(analytics);
    return { success: true };
  }),
});

import { z } from "zod";
import { TRPCError } from "@trpc/server";
import {
  links,
  settings,
  analytics,
  walletPass,
  vcard,
  contactSubmissions,
  pages,
} from "@linkden/db/schema";
import { router, protectedProcedure } from "../trpc";

export const exportRouter = router({
  /** Protected: JSON of all data */
  exportAll: protectedProcedure.query(async ({ ctx }) => {
    const [
      allLinks,
      allSettings,
      allAnalytics,
      allWalletPass,
      allVcard,
      allContacts,
      allPages,
    ] = await Promise.all([
      ctx.db.select().from(links),
      ctx.db.select().from(settings),
      ctx.db.select().from(analytics),
      ctx.db.select().from(walletPass),
      ctx.db.select().from(vcard),
      ctx.db.select().from(contactSubmissions),
      ctx.db.select().from(pages),
    ]);

    return {
      version: "1.0",
      exportedAt: new Date().toISOString(),
      data: {
        links: allLinks,
        settings: allSettings,
        analytics: allAnalytics,
        walletPass: allWalletPass,
        vcard: allVcard,
        contactSubmissions: allContacts,
        pages: allPages,
      },
    };
  }),

  /** Protected: replace all data from JSON */
  importAll: protectedProcedure
    .input(
      z.object({
        data: z.object({
          links: z.array(z.record(z.unknown())).optional(),
          settings: z.array(z.record(z.unknown())).optional(),
          analytics: z.array(z.record(z.unknown())).optional(),
          walletPass: z.array(z.record(z.unknown())).optional(),
          vcard: z.array(z.record(z.unknown())).optional(),
          contactSubmissions: z.array(z.record(z.unknown())).optional(),
          pages: z.array(z.record(z.unknown())).optional(),
        }),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Clear existing data
      await Promise.all([
        ctx.db.delete(analytics),
        ctx.db.delete(contactSubmissions),
        ctx.db.delete(pages),
      ]);
      // links after analytics (FK)
      await ctx.db.delete(links);
      await Promise.all([
        ctx.db.delete(settings),
        ctx.db.delete(walletPass),
        ctx.db.delete(vcard),
      ]);

      // Insert imported data
      const d = input.data;
      if (d.links?.length) {
        await ctx.db.insert(links).values(d.links as any);
      }
      if (d.settings?.length) {
        await ctx.db.insert(settings).values(d.settings as any);
      }
      if (d.analytics?.length) {
        await ctx.db.insert(analytics).values(d.analytics as any);
      }
      if (d.walletPass?.length) {
        await ctx.db.insert(walletPass).values(d.walletPass as any);
      }
      if (d.vcard?.length) {
        await ctx.db.insert(vcard).values(d.vcard as any);
      }
      if (d.contactSubmissions?.length) {
        await ctx.db
          .insert(contactSubmissions)
          .values(d.contactSubmissions as any);
      }
      if (d.pages?.length) {
        await ctx.db.insert(pages).values(d.pages as any);
      }

      return { success: true };
    }),

  /** Protected: parse LinkStack export format */
  importFromLinkStack: protectedProcedure
    .input(
      z.object({
        data: z.array(
          z.object({
            title: z.string().optional(),
            link: z.string().optional(),
            icon: z.string().optional(),
            order: z.number().optional(),
            active: z.boolean().optional(),
          })
        ),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (input.data.length === 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "No links to import",
        });
      }

      const values = input.data.map((item, idx) => ({
        type: "link" as const,
        title: item.title || "Untitled",
        url: item.link || "",
        icon: item.icon || "",
        sortOrder: item.order ?? idx,
        isActive: item.active ?? true,
      }));

      await ctx.db.insert(links).values(values);

      return { imported: values.length };
    }),
});

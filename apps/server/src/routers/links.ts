import { z } from "zod";
import { eq, asc, and, sql } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { links, analytics } from "@linkden/db/schema";
import {
  CreateLinkSchema,
  UpdateLinkSchema,
  ReorderLinksSchema,
} from "@linkden/validators";
import { router, publicProcedure, protectedProcedure } from "../trpc";

export const linksRouter = router({
  /** Public: active links ordered by sortOrder */
  list: publicProcedure.query(async ({ ctx }) => {
    return ctx.db
      .select()
      .from(links)
      .where(eq(links.isActive, true))
      .orderBy(asc(links.sortOrder));
  }),

  /** Protected: all links ordered by sortOrder */
  listAll: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db.select().from(links).orderBy(asc(links.sortOrder));
  }),

  /** Protected: create a new link */
  create: protectedProcedure
    .input(CreateLinkSchema)
    .mutation(async ({ ctx, input }) => {
      const [link] = await ctx.db
        .insert(links)
        .values({
          type: input.type,
          title: input.title,
          url: input.url,
          icon: input.icon,
          iconType: input.iconType,
          isActive: input.isActive,
          sortOrder: input.sortOrder,
          metadata: input.metadata,
        })
        .returning();
      return link;
    }),

  /** Protected: update a link by id */
  update: protectedProcedure
    .input(UpdateLinkSchema)
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      const [link] = await ctx.db
        .update(links)
        .set({ ...data, updatedAt: new Date().toISOString() })
        .where(eq(links.id, id))
        .returning();

      if (!link) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Link not found" });
      }
      return link;
    }),

  /** Protected: delete a link by id */
  delete: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const [deleted] = await ctx.db
        .delete(links)
        .where(eq(links.id, input.id))
        .returning();

      if (!deleted) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Link not found" });
      }
      return deleted;
    }),

  /** Protected: batch update sortOrders */
  reorder: protectedProcedure
    .input(ReorderLinksSchema)
    .mutation(async ({ ctx, input }) => {
      const now = new Date().toISOString();
      for (const item of input.items) {
        await ctx.db
          .update(links)
          .set({ sortOrder: item.sortOrder, updatedAt: now })
          .where(eq(links.id, item.id));
      }
      return { success: true };
    }),

  /** Protected: toggle isActive */
  toggleActive: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const [existing] = await ctx.db
        .select()
        .from(links)
        .where(eq(links.id, input.id));

      if (!existing) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Link not found" });
      }

      const [link] = await ctx.db
        .update(links)
        .set({
          isActive: !existing.isActive,
          updatedAt: new Date().toISOString(),
        })
        .where(eq(links.id, input.id))
        .returning();
      return link;
    }),

  /** Public: increment clickCount and log analytics */
  trackClick: publicProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        referrer: z.string().max(2000).default(""),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .update(links)
        .set({ clickCount: sql`${links.clickCount} + 1` })
        .where(eq(links.id, input.id));

      await ctx.db.insert(analytics).values({
        linkId: input.id,
        event: "link_click",
        referrer: input.referrer,
      });

      return { success: true };
    }),
});

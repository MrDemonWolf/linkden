import { z } from "zod";
import { eq, and } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { pages } from "@linkden/db/schema";
import { CreatePageSchema, UpdatePageSchema } from "@linkden/validators";
import { router, publicProcedure, protectedProcedure } from "../trpc";

export const pagesRouter = router({
  /** Protected: all pages */
  list: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db.select().from(pages);
  }),

  /** Public: get published page by slug */
  getBySlug: publicProcedure
    .input(z.object({ slug: z.string().min(1).max(100) }))
    .query(async ({ ctx, input }) => {
      const [page] = await ctx.db
        .select()
        .from(pages)
        .where(
          and(eq(pages.slug, input.slug), eq(pages.isPublished, true))
        );

      if (!page) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Page not found",
        });
      }
      return page;
    }),

  /** Protected: create page */
  create: protectedProcedure
    .input(CreatePageSchema)
    .mutation(async ({ ctx, input }) => {
      // Check slug uniqueness
      const [existing] = await ctx.db
        .select()
        .from(pages)
        .where(eq(pages.slug, input.slug));

      if (existing) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "A page with this slug already exists",
        });
      }

      const [page] = await ctx.db
        .insert(pages)
        .values({
          slug: input.slug,
          title: input.title,
          content: input.content,
          isPublished: input.isPublished,
        })
        .returning();
      return page;
    }),

  /** Protected: update page */
  update: protectedProcedure
    .input(UpdatePageSchema)
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;

      // If updating slug, check uniqueness
      if (data.slug) {
        const [existing] = await ctx.db
          .select()
          .from(pages)
          .where(and(eq(pages.slug, data.slug)));

        if (existing && existing.id !== id) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "A page with this slug already exists",
          });
        }
      }

      const [page] = await ctx.db
        .update(pages)
        .set({ ...data, updatedAt: new Date().toISOString() })
        .where(eq(pages.id, id))
        .returning();

      if (!page) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Page not found",
        });
      }
      return page;
    }),

  /** Protected: delete page */
  delete: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const [deleted] = await ctx.db
        .delete(pages)
        .where(eq(pages.id, input.id))
        .returning();

      if (!deleted) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Page not found",
        });
      }
      return deleted;
    }),
});

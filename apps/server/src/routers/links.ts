import { analytics, links } from "@linkden/db/schema";
import { CreateLinkSchema, ReorderLinksSchema, UpdateLinkSchema } from "@linkden/validators";
import { TRPCError } from "@trpc/server";
import { asc, eq, isNotNull, sql } from "drizzle-orm";
import { z } from "zod";
import { purgePublicCache } from "../lib/cache";
import { protectedProcedure, publicProcedure, router } from "../trpc";

export const linksRouter = router({
  /** Public: active links ordered by sortOrder — returns only published (live) data */
  list: publicProcedure.query(async ({ ctx }) => {
    return ctx.db
      .select()
      .from(links)
      .where(eq(links.isActive, true))
      .orderBy(asc(links.sortOrder));
  }),

  /** Protected: all links ordered by sortOrder — merges draft overlays on top of live data */
  listAll: protectedProcedure.query(async ({ ctx }) => {
    const rows = await ctx.db.select().from(links).orderBy(asc(links.sortOrder));
    return rows.map((row) => {
      if (!row.draft) return row;
      const draft = row.draft as Record<string, unknown>;
      return {
        ...row,
        title: (draft.title as string) ?? row.title,
        url: (draft.url as string) ?? row.url,
        icon: (draft.icon as string) ?? row.icon,
        iconType: (draft.iconType as typeof row.iconType) ?? row.iconType,
        isActive: (draft.isActive as boolean) ?? row.isActive,
        metadata: (draft.metadata as typeof row.metadata) ?? row.metadata,
        type: (draft.type as typeof row.type) ?? row.type,
        _hasDraft: true,
      };
    });
  }),

  /** Protected: count of unpublished changes */
  draftCount: protectedProcedure.query(async ({ ctx }) => {
    const [result] = await ctx.db
      .select({ count: sql<number>`count(*)` })
      .from(links)
      .where(isNotNull(links.draft));
    return result?.count ?? 0;
  }),

  /** Protected: create a new link — new blocks have both live and draft populated */
  create: protectedProcedure.input(CreateLinkSchema).mutation(async ({ ctx, input }) => {
    const draftData = {
      type: input.type,
      title: input.title,
      url: input.url,
      icon: input.icon,
      iconType: input.iconType,
      isActive: input.isActive,
      metadata: input.metadata,
    };

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
        draft: draftData,
      })
      .returning();

    return link;
  }),

  /** Protected: update a link — writes to draft JSON column instead of live columns */
  update: protectedProcedure.input(UpdateLinkSchema).mutation(async ({ ctx, input }) => {
    const { id, ...data } = input;

    // Get existing link to merge draft
    const [existing] = await ctx.db.select().from(links).where(eq(links.id, id));
    if (!existing) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Link not found" });
    }

    const existingDraft = (existing.draft as Record<string, unknown>) || {};
    const newDraft = { ...existingDraft };

    // Only include fields that were actually provided in the update
    if (data.title !== undefined) newDraft.title = data.title;
    if (data.url !== undefined) newDraft.url = data.url;
    if (data.icon !== undefined) newDraft.icon = data.icon;
    if (data.iconType !== undefined) newDraft.iconType = data.iconType;
    if (data.isActive !== undefined) newDraft.isActive = data.isActive;
    if (data.metadata !== undefined) newDraft.metadata = data.metadata;
    if (data.type !== undefined) newDraft.type = data.type;

    const updatePayload: Record<string, unknown> = {
      draft: newDraft,
      updatedAt: new Date().toISOString(),
    };

    // sortOrder changes are applied immediately (not draft-able)
    if (data.sortOrder !== undefined) {
      updatePayload.sortOrder = data.sortOrder;
    }

    const [link] = await ctx.db
      .update(links)
      .set(updatePayload)
      .where(eq(links.id, id))
      .returning();

    return link;
  }),

  /** Protected: delete a link by id */
  delete: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const [deleted] = await ctx.db.delete(links).where(eq(links.id, input.id)).returning();

      if (!deleted) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Link not found" });
      }

      const apiUrl = ctx.env.APP_URL || "http://localhost:3000";
      await purgePublicCache(apiUrl);

      return deleted;
    }),

  /** Protected: batch update sortOrders (immediate, not drafted) */
  reorder: protectedProcedure.input(ReorderLinksSchema).mutation(async ({ ctx, input }) => {
    const now = new Date().toISOString();
    for (const item of input.items) {
      await ctx.db
        .update(links)
        .set({ sortOrder: item.sortOrder, updatedAt: now })
        .where(eq(links.id, item.id));
    }
    return { success: true };
  }),

  /** Protected: toggle isActive (via draft) */
  toggleActive: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const [existing] = await ctx.db.select().from(links).where(eq(links.id, input.id));

      if (!existing) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Link not found" });
      }

      // Determine current effective isActive (draft takes precedence)
      const draft = (existing.draft as Record<string, unknown>) || {};
      const currentActive = draft.isActive !== undefined ? (draft.isActive as boolean) : existing.isActive;

      const newDraft = { ...draft, isActive: !currentActive };

      const [link] = await ctx.db
        .update(links)
        .set({
          draft: newDraft,
          updatedAt: new Date().toISOString(),
        })
        .where(eq(links.id, input.id))
        .returning();

      return link;
    }),

  /** Protected: publish all drafts — merge draft into live columns, clear draft, set publishedAt */
  publish: protectedProcedure.mutation(async ({ ctx }) => {
    const drafts = await ctx.db
      .select()
      .from(links)
      .where(isNotNull(links.draft));

    const now = Date.now();
    const nowIso = new Date().toISOString();

    for (const row of drafts) {
      const draft = row.draft as Record<string, unknown>;
      const updates: Record<string, unknown> = {
        draft: null,
        publishedAt: now,
        updatedAt: nowIso,
      };

      if (draft.title !== undefined) updates.title = draft.title;
      if (draft.url !== undefined) updates.url = draft.url;
      if (draft.icon !== undefined) updates.icon = draft.icon;
      if (draft.iconType !== undefined) updates.iconType = draft.iconType;
      if (draft.isActive !== undefined) updates.isActive = draft.isActive;
      if (draft.metadata !== undefined) updates.metadata = draft.metadata;
      if (draft.type !== undefined) updates.type = draft.type;

      await ctx.db.update(links).set(updates).where(eq(links.id, row.id));
    }

    const apiUrl = ctx.env.APP_URL || "http://localhost:3000";
    await purgePublicCache(apiUrl);

    return { published: drafts.length };
  }),

  /** Public: increment clickCount and log analytics */
  trackClick: publicProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        referrer: z.string().max(2000).default(""),
      }),
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

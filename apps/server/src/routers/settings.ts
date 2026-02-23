import { settings } from "@linkden/db/schema";
import { UpdateSettingsSchema } from "@linkden/validators";
import { inArray, isNotNull, sql } from "drizzle-orm";
import { purgePublicCache } from "../lib/cache";
import { protectedProcedure, publicProcedure, router } from "../trpc";

/** Settings keys that are safe for public consumption */
const PUBLIC_SETTING_KEYS = [
  "theme",
  "themeMode",
  "accentColor",
  "backgroundColor",
  "textColor",
  "brandName",
  "brandLogo",
  "brandFavicon",
  "profileName",
  "profileBio",
  "profileImage",
  "socialLinks",
  "metaTitle",
  "metaDescription",
  "metaImage",
  "customCss",
  "customHead",
  "contactEnabled",
  "captchaSiteKey",
  "captchaType",
  "brandEnabled",
  "verifiedBadge",
];

export const settingsRouter = router({
  /** Protected: get all settings — returns draftValue ?? value for each setting */
  getAll: protectedProcedure.query(async ({ ctx }) => {
    const rows = await ctx.db.select().from(settings);
    return rows.map((row) => ({
      ...row,
      value: row.draftValue ?? row.value,
      _hasDraft: row.draftValue !== null,
    }));
  }),

  /** Public: only public-facing settings — returns only live value (ignores draftValue) */
  getPublic: publicProcedure.query(async ({ ctx }) => {
    return ctx.db
      .select({ key: settings.key, value: settings.value, updatedAt: settings.updatedAt })
      .from(settings)
      .where(inArray(settings.key, PUBLIC_SETTING_KEYS));
  }),

  /** Protected: count of unpublished setting changes */
  draftCount: protectedProcedure.query(async ({ ctx }) => {
    const [result] = await ctx.db
      .select({ count: sql<number>`count(*)` })
      .from(settings)
      .where(isNotNull(settings.draftValue));
    return result?.count ?? 0;
  }),

  /** Protected: upsert settings — writes to draftValue instead of value */
  update: protectedProcedure.input(UpdateSettingsSchema).mutation(async ({ ctx, input }) => {
    const now = new Date().toISOString();

    for (const setting of input.settings) {
      await ctx.db
        .insert(settings)
        .values({
          key: setting.key,
          value: setting.value,
          draftValue: setting.value,
          updatedAt: now,
        })
        .onConflictDoUpdate({
          target: settings.key,
          set: { draftValue: setting.value, updatedAt: now },
        });
    }

    return { success: true };
  }),

  /** Protected: publish all drafts — copies draftValue to value, clears draftValue */
  publish: protectedProcedure.mutation(async ({ ctx }) => {
    const drafts = await ctx.db.select().from(settings).where(isNotNull(settings.draftValue));

    const now = new Date().toISOString();

    for (const row of drafts) {
      await ctx.db
        .insert(settings)
        .values({ key: row.key, value: row.draftValue!, draftValue: null, updatedAt: now })
        .onConflictDoUpdate({
          target: settings.key,
          set: { value: row.draftValue!, draftValue: null, updatedAt: now },
        });
    }

    // Purge edge cache so visitors see updates immediately
    const apiUrl = ctx.env.APP_URL || "http://localhost:3000";
    await purgePublicCache(apiUrl);

    return { published: drafts.length };
  }),
});

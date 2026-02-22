import { eq, inArray } from "drizzle-orm";
import { settings } from "@linkden/db/schema";
import { UpdateSettingsSchema } from "@linkden/validators";
import { router, publicProcedure, protectedProcedure } from "../trpc";

/** Settings keys that are safe for public consumption */
const PUBLIC_SETTING_KEYS = [
  "theme",
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
];

export const settingsRouter = router({
  /** Protected: get all settings */
  getAll: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db.select().from(settings);
  }),

  /** Public: only public-facing settings */
  getPublic: publicProcedure.query(async ({ ctx }) => {
    return ctx.db
      .select()
      .from(settings)
      .where(inArray(settings.key, PUBLIC_SETTING_KEYS));
  }),

  /** Protected: upsert settings */
  update: protectedProcedure
    .input(UpdateSettingsSchema)
    .mutation(async ({ ctx, input }) => {
      const now = new Date().toISOString();

      for (const setting of input.settings) {
        await ctx.db
          .insert(settings)
          .values({ key: setting.key, value: setting.value, updatedAt: now })
          .onConflictDoUpdate({
            target: settings.key,
            set: { value: setting.value, updatedAt: now },
          });
      }

      return { success: true };
    }),
});

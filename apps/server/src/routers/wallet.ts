import { walletPass } from "@linkden/db/schema";
import { UpdateWalletPassSchema } from "@linkden/validators";
import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import { protectedProcedure, router } from "../trpc";

export const walletRouter = router({
  /** Protected: get wallet pass config */
  get: protectedProcedure.query(async ({ ctx }) => {
    const [pass] = await ctx.db.select().from(walletPass).limit(1);
    return pass ?? null;
  }),

  /** Protected: upsert wallet pass config */
  update: protectedProcedure.input(UpdateWalletPassSchema).mutation(async ({ ctx, input }) => {
    const [existing] = await ctx.db.select().from(walletPass).limit(1);
    const now = new Date().toISOString();

    if (existing) {
      const [updated] = await ctx.db
        .update(walletPass)
        .set({ ...input, updatedAt: now })
        .where(eq(walletPass.id, existing.id))
        .returning();
      return updated;
    }

    const [created] = await ctx.db
      .insert(walletPass)
      .values({ ...input })
      .returning();
    return created;
  }),

  /** Protected: generate and download wallet pass (admin-only) */
  generate: protectedProcedure.query(async ({ ctx }) => {
    const [pass] = await ctx.db.select().from(walletPass).limit(1);

    if (!pass) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Wallet pass is not configured",
      });
    }

    const env = ctx.env;
    if (!env.APPLE_PASS_SIGNER_CERT || !env.APPLE_PASS_SIGNER_KEY) {
      throw new TRPCError({
        code: "PRECONDITION_FAILED",
        message:
          "Apple pass signing credentials are not configured. Set APPLE_PASS_SIGNER_CERT and APPLE_PASS_SIGNER_KEY.",
      });
    }

    // Placeholder: actual .pkpass generation requires native signing
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message:
        "Wallet pass generation is not yet implemented. This feature requires native Apple pass signing.",
    });
  }),
});

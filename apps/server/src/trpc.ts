import type { Database } from "@linkden/db";
import { TRPCError, initTRPC } from "@trpc/server";
import type { Env } from "./env";

export interface Context {
  db: Database;
  userId: string | null;
  env: Env;
}

const t = initTRPC.context<Context>().create();

export const router = t.router;
export const publicProcedure = t.procedure;

export const protectedProcedure = t.procedure.use(async ({ ctx, next }) => {
  if (!ctx.userId) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "You must be logged in to perform this action",
    });
  }
  return next({
    ctx: {
      ...ctx,
      userId: ctx.userId,
    },
  });
});

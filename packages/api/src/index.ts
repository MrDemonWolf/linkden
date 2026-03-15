import { initTRPC, TRPCError } from "@trpc/server";

import type { Context } from "./context";

export const t = initTRPC.context<Context>().create();

export const router = t.router;
export const middleware = t.middleware;

export const publicProcedure = t.procedure;

// Single-user assumption: protectedProcedure gates on session existence only.
// The signup-lock middleware in apps/server/src/index.ts ensures only one user
// can ever register, so all authenticated requests belong to the admin.
export const protectedProcedure = t.procedure.use(({ ctx, next }) => {
	if (!ctx.session) {
		throw new TRPCError({
			code: "UNAUTHORIZED",
			message: "Authentication required",
			cause: "No session",
		});
	}
	return next({
		ctx: {
			...ctx,
			session: ctx.session,
		},
	});
});

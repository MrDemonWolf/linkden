import { initTRPC, TRPCError } from "@trpc/server";

import type { Context } from "./context";

export const t = initTRPC.context<Context>().create({
	// tRPC derives isDev from NODE_ENV, which the Worker never sets, so it would
	// ship stack traces in every error body. Pin it off explicitly.
	isDev: false,
	errorFormatter({ shape, error }) {
		const { stack: _stack, ...data } = shape.data;
		// Unexpected failures surface the raw cause (D1/SQL text) as the message;
		// keep that in the server log (trpcServer onError) and out of the response.
		if (error.code === "INTERNAL_SERVER_ERROR") {
			return { ...shape, message: "Internal server error", data };
		}
		return { ...shape, data };
	},
});

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

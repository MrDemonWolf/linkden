import type { Context as HonoContext } from "hono";
import { auth, getSessionQuery } from "@linkden/auth";

export type CreateContextOptions = {
	context: HonoContext;
};

export async function createContext({ context }: CreateContextOptions) {
	const session = await auth.api.getSession({
		headers: context.req.raw.headers,
		// Mutations (POST) skip the cookie cache so a revoked session is
		// rejected immediately; queries (GET) may use it.
		query: getSessionQuery(context.req.method),
	});

	return {
		session,
		headers: context.req.raw.headers,
	};
}

export type Context = Awaited<ReturnType<typeof createContext>>;

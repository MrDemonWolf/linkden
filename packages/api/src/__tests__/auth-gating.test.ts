import { describe, expect, it, vi } from "vitest";

// protectedProcedure is the only server-side authorization check for every
// admin router. Walk the whole router so swapping one procedure to
// publicProcedure (or breaking the middleware) fails CI.
vi.mock("@linkden/env/server", () => ({ env: {} }));
vi.mock("@linkden/db", async () => {
	const { createTestDb } = await import("@linkden/db/testing");
	const { db } = await createTestDb();
	return { db };
});

const { appRouter } = await import("../routers/index");

// The only paths an anonymous visitor may call. Anything new outside these
// needs a deliberate change here.
const PUBLIC_PATHS = [/^public\./, /^version\./, /^healthCheck$/];
const isPublic = (path: string) => PUBLIC_PATHS.some((re) => re.test(path));

const anonymous = appRouter.createCaller({ session: null, headers: new Headers() } as never);

function resolve(path: string): (input?: unknown) => Promise<unknown> {
	// biome-ignore lint/suspicious/noExplicitAny: walking the caller proxy by dotted path
	let target: any = anonymous;
	for (const part of path.split(".")) target = target[part];
	return target;
}

const paths = Object.keys(appRouter._def.procedures);
const protectedPaths = paths.filter((p) => !isPublic(p));

describe("protected procedures", () => {
	it("covers the admin routers", () => {
		for (const prefix of ["blocks.", "settings.", "forms.", "analytics.", "backup.", "danger."]) {
			expect(
				protectedPaths.some((p) => p.startsWith(prefix)),
				prefix,
			).toBe(true);
		}
	});

	it.each(protectedPaths)("%s rejects an anonymous caller", async (path) => {
		// The auth middleware runs before input parsing, so no valid input is needed.
		await expect(resolve(path)(undefined)).rejects.toMatchObject({ code: "UNAUTHORIZED" });
	});
});

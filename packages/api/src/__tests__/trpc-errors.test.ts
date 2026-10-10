import { TRPCError } from "@trpc/server";
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { describe, expect, it } from "vitest";
import { publicProcedure, router } from "../index";

// The shared tRPC instance must never put stack traces or raw internal error
// text (D1/SQL messages) in a response body, whatever NODE_ENV says.
const testRouter = router({
	boom: publicProcedure.query(() => {
		throw new Error("D1_ERROR: no such table: secret_table");
	}),
	bad: publicProcedure.query(() => {
		throw new TRPCError({ code: "BAD_REQUEST", message: "CAPTCHA verification failed" });
	}),
});

async function call(path: string) {
	const res = await fetchRequestHandler({
		endpoint: "/trpc",
		req: new Request(`http://localhost/trpc/${path}`),
		router: testRouter,
		createContext: () => ({ session: null, headers: new Headers() }) as never,
	});
	return { status: res.status, body: JSON.stringify(await res.json()) };
}

describe("tRPC error shape", () => {
	it("masks internal errors and omits the stack", async () => {
		const { status, body } = await call("boom");
		expect(status).toBe(500);
		expect(body).toContain("Internal server error");
		expect(body).not.toContain("secret_table");
		expect(body).not.toContain('"stack"');
	});

	it("keeps deliberate client-facing messages", async () => {
		const { status, body } = await call("bad");
		expect(status).toBe(400);
		expect(body).toContain("CAPTCHA verification failed");
		expect(body).not.toContain('"stack"');
	});
});

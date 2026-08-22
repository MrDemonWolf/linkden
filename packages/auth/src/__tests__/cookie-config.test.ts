import * as authSchema from "@linkden/db/schema/auth";
import { createTestDb } from "@linkden/db/testing";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { beforeEach, describe, expect, it } from "vitest";

// Locks the production cookie contract: web and API share one origin, so the
// session cookie must be Secure + HttpOnly + SameSite=Lax and host-only (no
// Domain= attribute). Mirrors the `advanced` + `session` config in ../index.ts
// with an https baseURL, which is what flips `secure` on.

const BASE_URL = "https://l.example.test";
const EMAIL = "admin@example.com";
const PASSWORD = "correct-horse-battery-staple";

function makeAuth(db: Awaited<ReturnType<typeof createTestDb>>["db"]) {
	return betterAuth({
		database: drizzleAdapter(db, { provider: "sqlite", schema: authSchema }),
		emailAndPassword: { enabled: true },
		session: { cookieCache: { enabled: true, maxAge: 300 } },
		secret: "test-secret-0123456789-0123456789-0123456789",
		baseURL: BASE_URL,
		advanced: {
			defaultCookieAttributes: {
				sameSite: "lax",
				secure: BASE_URL.startsWith("https"),
				httpOnly: true,
			},
		},
	});
}

function setCookies(headers: Headers): string[] {
	// Runtime Headers has getSetCookie(); the workers-types lib this package
	// compiles against does not declare it yet.
	const cookies = (headers as unknown as { getSetCookie(): string[] }).getSetCookie();
	expect(cookies.length).toBeGreaterThan(0);
	return cookies;
}

function expectSameOriginCookie(cookie: string) {
	expect(cookie).toMatch(/;\s*Secure/i);
	expect(cookie).toMatch(/;\s*HttpOnly/i);
	expect(cookie).toMatch(/;\s*SameSite=Lax/i);
	expect(cookie).not.toMatch(/Domain=/i);
}

describe("session cookie attributes", () => {
	let auth: ReturnType<typeof makeAuth>;

	beforeEach(async () => {
		const { db } = await createTestDb();
		auth = makeAuth(db);
	});

	it("sign-up sets a Secure, HttpOnly, SameSite=Lax, host-only cookie", async () => {
		const { headers } = await auth.api.signUpEmail({
			body: { email: EMAIL, password: PASSWORD, name: "Admin" },
			returnHeaders: true,
		});
		for (const cookie of setCookies(headers)) expectSameOriginCookie(cookie);
	});

	it("sign-in sets the session token and cookie-cache cookies with the same attributes", async () => {
		await auth.api.signUpEmail({ body: { email: EMAIL, password: PASSWORD, name: "Admin" } });

		const { headers } = await auth.api.signInEmail({
			body: { email: EMAIL, password: PASSWORD },
			returnHeaders: true,
		});
		const cookies = setCookies(headers);
		for (const cookie of cookies) expectSameOriginCookie(cookie);

		// https baseURL => the __Secure- prefix; cookieCache adds session_data.
		expect(cookies.some((c) => c.startsWith("__Secure-better-auth.session_token="))).toBe(true);
		expect(cookies.some((c) => c.startsWith("__Secure-better-auth.session_data="))).toBe(true);
	});
});

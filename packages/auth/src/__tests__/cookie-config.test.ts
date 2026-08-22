import * as authSchema from "@linkden/db/schema/auth";
import { createTestDb } from "@linkden/db/testing";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { beforeEach, describe, expect, it } from "vitest";
import {
	cookieAttributes,
	getSessionQuery,
	SESSION_COOKIE_CACHE_MAX_AGE,
	sessionOptions,
} from "../auth-options";

// Locks the production cookie contract: web and API share one origin, so the
// session cookie must be Secure + HttpOnly + SameSite=Lax and host-only (no
// Domain= attribute). Built from the same `auth-options` export that
// ../index.ts spreads into betterAuth(), so a drift there fails here.

const BASE_URL = "https://l.example.test";
const EMAIL = "admin@example.com";
const PASSWORD = "correct-horse-battery-staple";

function makeAuth(db: Awaited<ReturnType<typeof createTestDb>>["db"]) {
	return betterAuth({
		database: drizzleAdapter(db, { provider: "sqlite", schema: authSchema }),
		emailAndPassword: { enabled: true },
		session: sessionOptions,
		secret: "test-secret-0123456789-0123456789-0123456789",
		baseURL: BASE_URL,
		advanced: { defaultCookieAttributes: cookieAttributes(BASE_URL) },
	});
}

function cookieHeader(setCookies: string[]): string {
	return setCookies.map((c) => c.split(";")[0]).join("; ");
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

describe("session cookie cache", () => {
	it("is bounded to one minute and off for non-GET requests", () => {
		expect(SESSION_COOKIE_CACHE_MAX_AGE).toBeLessThanOrEqual(60);
		expect(cookieAttributes("http://localhost:3000").secure).toBe(false);
		expect(getSessionQuery("GET")).toEqual({ disableCookieCache: false });
		expect(getSessionQuery("POST")).toEqual({ disableCookieCache: true });
		expect(getSessionQuery("delete")).toEqual({ disableCookieCache: true });
	});

	it("a deleted session is rejected as soon as the cache is bypassed (mutations)", async () => {
		const { db } = await createTestDb();
		const auth = makeAuth(db);
		await auth.api.signUpEmail({ body: { email: EMAIL, password: PASSWORD, name: "Admin" } });
		const { headers } = await auth.api.signInEmail({
			body: { email: EMAIL, password: PASSWORD },
			returnHeaders: true,
		});
		const cookie = cookieHeader(setCookies(headers));

		// Same wipe as danger.resetEverything.
		await db.delete(authSchema.session);
		await db.delete(authSchema.account);
		await db.delete(authSchema.user);

		const cached = await auth.api.getSession({
			headers: new Headers({ cookie }),
			query: getSessionQuery("GET"),
		});
		const authoritative = await auth.api.getSession({
			headers: new Headers({ cookie }),
			query: getSessionQuery("POST"),
		});
		// The GET path may still answer from the signed cookie (≤ maxAge); the
		// POST path must not.
		expect(cached === null || cached.user.email === EMAIL).toBe(true);
		expect(authoritative).toBeNull();
	});
});

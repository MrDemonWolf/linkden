import * as authSchema from "@linkden/db/schema/auth";
import { createTestDb } from "@linkden/db/testing";
import { beforeEach, describe, expect, it } from "vitest";
import {
	authSecretProblem,
	BETTER_AUTH_DEFAULT_SECRET,
	cookieAttributes,
	getSessionQuery,
	MIN_AUTH_SECRET_LENGTH,
	resolveAuthSecret,
	SESSION_COOKIE_CACHE_MAX_AGE,
	sessionOptions,
} from "../auth-options";

import { EMAIL, makeAuth as makeTestAuth, PASSWORD } from "./auth-test-utils";

// Locks the production cookie contract: web and API share one origin, so the
// session cookie must be Secure + HttpOnly + SameSite=Lax and host-only (no
// Domain= attribute). Built from the same `createAuthOptions` factory that
// ../index.ts passes to betterAuth() (plugins included), so a drift there
// fails here.

const BASE_URL = "https://l.example.test";

function makeAuth(db: Awaited<ReturnType<typeof createTestDb>>["db"]) {
	return makeTestAuth(db, { baseURL: BASE_URL }).auth;
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
		expect(sessionOptions.cookieCache.maxAge).toBe(SESSION_COOKIE_CACHE_MAX_AGE);
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

describe("resolveAuthSecret", () => {
	const PROD = "https://l.example.test";
	const STRONG = "k3Q9vZ1xR7mP2wL8tY4nB6cH0sD5fG3jA1eU9iO7";

	it("returns a strong secret unchanged", () => {
		expect(STRONG.length).toBeGreaterThanOrEqual(MIN_AUTH_SECRET_LENGTH);
		expect(resolveAuthSecret(STRONG, PROD)).toBe(STRONG);
	});

	// Better Auth would otherwise fall back to its public default secret, and
	// its own production guard keys off NODE_ENV, which Workers never set.
	it.each([undefined, "", "   "])(
		"throws when the secret is missing (%j), even locally",
		(secret) => {
			expect(() => resolveAuthSecret(secret, PROD)).toThrow(/BETTER_AUTH_SECRET/);
			expect(() => resolveAuthSecret(secret, "http://localhost:3000")).toThrow(
				/BETTER_AUTH_SECRET/,
			);
		},
	);

	it.each([
		"short-secret",
		"ci-placeholder-secret-for-build",
		"better-auth-secret-12345678901234567890",
	])("rejects a weak or placeholder secret (%s) on a deployed base URL", (secret) => {
		expect(() => resolveAuthSecret(secret, PROD)).toThrow(/at least/);
		// An empty or malformed BETTER_AUTH_URL is treated as deployed, not local.
		expect(() => resolveAuthSecret(secret, "")).toThrow(/at least/);
	});

	it("allows the .env.example placeholder for local http dev", () => {
		expect(resolveAuthSecret("your-secret-key-here", "http://localhost:3000")).toBe(
			"your-secret-key-here",
		);
	});
});

describe("authSecretProblem", () => {
	const PROD = "https://l.example.test";

	it("is pure: reports a reason instead of throwing, null when usable", () => {
		expect(authSecretProblem(undefined, PROD)).toMatch(/not set/);
		expect(authSecretProblem("short", PROD)).toMatch(/at least/);
		expect(authSecretProblem(BETTER_AUTH_DEFAULT_SECRET, PROD)).toMatch(/placeholder/);
		expect(authSecretProblem("k3Q9vZ1xR7mP2wL8tY4nB6cH0sD5fG3jA1eU9iO7", PROD)).toBeNull();
		expect(authSecretProblem("dev", "http://localhost:3000")).toBeNull();
	});
});

// Shared harness for the auth integration tests: a real betterAuth instance
// built from the production `createAuthOptions` (plugins, hooks and email flows
// included) on an in-memory libsql database, with outgoing mail captured.
import { createHmac } from "node:crypto";
import { siteSettings } from "@linkden/db/schema/index";
import { createTestDb } from "@linkden/db/testing";
import { betterAuth } from "better-auth";
import { expect } from "vitest";
import { type AuthEmail, createAuthOptions } from "../auth-options";

export const TEST_SECRET = "test-secret-0123456789-0123456789-0123456789";
export const EMAIL = "admin@example.com";
export const PASSWORD = "correct-horse-battery-staple";

type TestDb = Awaited<ReturnType<typeof createTestDb>>["db"];

export function makeAuth(
	db: TestDb,
	{
		baseURL = "http://localhost:3000",
		emailConfigured = true,
	}: { baseURL?: string; emailConfigured?: boolean } = {},
) {
	const sent: AuthEmail[] = [];
	const auth = betterAuth(
		createAuthOptions({
			db,
			secret: TEST_SECRET,
			baseURL,
			trustedOrigins: [baseURL],
			// Mirrors index.ts: with no mailer configured, sends are dropped silently.
			sendEmail: async (email) => {
				if (emailConfigured) sent.push(email);
			},
			isEmailConfigured: async () => emailConfigured,
		}),
	);
	return { auth, sent };
}

export type TestAuth = ReturnType<typeof makeAuth>["auth"];

export async function setupAdmin(opts?: Parameters<typeof makeAuth>[1]) {
	const { db } = await createTestDb();
	const { auth, sent } = makeAuth(db, opts);
	await auth.api.signUpEmail({ body: { email: EMAIL, password: PASSWORD, name: "Admin" } });
	return { db, auth, sent };
}

export async function setSetting(db: TestDb, key: string, value: string) {
	await db
		.insert(siteSettings)
		.values({ key, value })
		.onConflictDoUpdate({ target: siteSettings.key, set: { value } });
}

function setCookies(headers: Headers): string[] {
	// Runtime Headers has getSetCookie(); the workers-types lib this package
	// compiles against does not declare it yet.
	return (headers as unknown as { getSetCookie(): string[] }).getSetCookie();
}

/** `Cookie` request header carrying every cookie the response set (expired ones dropped). */
export function cookieHeader(headers: Headers): string {
	return setCookies(headers)
		.filter((c) => !/max-age=0\b/i.test(c))
		.map((c) => c.split(";")[0])
		.join("; ");
}

export async function signInCookie(auth: TestAuth, password = PASSWORD): Promise<string> {
	const { headers } = await auth.api.signInEmail({
		body: { email: EMAIL, password },
		returnHeaders: true,
	});
	const cookie = cookieHeader(headers);
	expect(cookie).toMatch(/session_token=/);
	return cookie;
}

/** Pull the first link out of a captured email's HTML. */
export function linkFrom(email: AuthEmail | undefined): string {
	const m = email?.html.match(/href="([^"]+)"/);
	if (!m?.[1]) throw new Error(`no link in email: ${email?.subject}`);
	return m[1];
}

// ─── TOTP (RFC 6238, SHA-1, 6 digits, 30 s) ──────────────────────────────────

function base32Decode(input: string): Buffer {
	const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
	let bits = 0;
	let value = 0;
	const out: number[] = [];
	for (const ch of input.replace(/=+$/, "").toUpperCase()) {
		const idx = alphabet.indexOf(ch);
		if (idx < 0) throw new Error(`bad base32 char: ${ch}`);
		value = (value << 5) | idx;
		bits += 5;
		if (bits >= 8) {
			out.push((value >>> (bits - 8)) & 0xff);
			bits -= 8;
		}
	}
	return Buffer.from(out);
}

/** Current TOTP code for an `otpauth://` URI, as an authenticator app would show it. */
export function totpFromURI(uri: string, now = Date.now()): string {
	const secret = new URL(uri).searchParams.get("secret");
	if (!secret) throw new Error(`no secret in ${uri}`);
	const counter = Buffer.alloc(8);
	counter.writeBigUInt64BE(BigInt(Math.floor(now / 30_000)));
	const hmac = createHmac("sha1", base32Decode(secret)).update(counter).digest();
	const offset = (hmac[hmac.length - 1] ?? 0) & 0xf;
	const code = (hmac.readUInt32BE(offset) & 0x7fffffff) % 1_000_000;
	return code.toString().padStart(6, "0");
}

import { twoFactor, user } from "@linkden/db/schema/auth";
import { describe, expect, it } from "vitest";
import {
	cookieHeader,
	EMAIL,
	PASSWORD,
	setupAdmin,
	signInCookie,
	type TestAuth,
	totpFromURI,
} from "./auth-test-utils";

// End-to-end 2FA against the real migrated schema (two_factor table, 0008) and
// the production plugin set: enable → verify first code → password sign-in is
// challenged → TOTP or a backup code completes it.

async function enable(auth: TestAuth, cookie: string) {
	const res = await auth.api.enableTwoFactor({
		body: { password: PASSWORD },
		headers: new Headers({ cookie }),
	});
	expect(res.totpURI).toMatch(/^otpauth:\/\/totp\/LinkDen:/);
	expect(res.backupCodes.length).toBeGreaterThan(0);
	return res;
}

async function enableAndVerify(auth: TestAuth) {
	const cookie = await signInCookie(auth);
	const { totpURI, backupCodes } = await enable(auth, cookie);
	await auth.api.verifyTOTP({
		body: { code: totpFromURI(totpURI) },
		headers: new Headers({ cookie }),
	});
	return { totpURI, backupCodes };
}

async function passwordChallenge(auth: TestAuth) {
	const { headers, response } = await auth.api.signInEmail({
		body: { email: EMAIL, password: PASSWORD },
		returnHeaders: true,
	});
	return { response: response as Record<string, unknown>, cookie: cookieHeader(headers) };
}

describe("two-factor authentication", () => {
	it("creates the admin with a verified email", async () => {
		const { db } = await setupAdmin();
		const [admin] = await db.select().from(user);
		expect(admin?.emailVerified).toBe(true);
	});

	it("enable stores an encrypted secret but leaves 2FA off until a code verifies", async () => {
		const { db, auth } = await setupAdmin();
		const cookie = await signInCookie(auth);
		const { totpURI } = await enable(auth, cookie);

		const rows = await db.select().from(twoFactor);
		expect(rows).toHaveLength(1);
		expect(rows[0]?.verified).toBe(false);
		// Stored encrypted, never the raw base32 secret from the URI.
		expect(rows[0]?.secret).not.toContain(new URL(totpURI).searchParams.get("secret"));

		const [admin] = await db.select().from(user);
		expect(admin?.twoFactorEnabled).toBe(false);

		// An abandoned setup must not challenge (and so cannot lock out) sign-in.
		const { response } = await passwordChallenge(auth);
		expect(response.twoFactorRedirect).toBeUndefined();
	});

	it("rejects enabling with a wrong password", async () => {
		const { auth } = await setupAdmin();
		const cookie = await signInCookie(auth);
		await expect(
			auth.api.enableTwoFactor({
				body: { password: "wrong-password-000" },
				headers: new Headers({ cookie }),
			}),
		).rejects.toThrow();
	});

	it("challenges password sign-in once verified and accepts the TOTP code", async () => {
		const { db, auth } = await setupAdmin();
		const { totpURI } = await enableAndVerify(auth);

		const [admin] = await db.select().from(user);
		expect(admin?.twoFactorEnabled).toBe(true);

		const { response, cookie } = await passwordChallenge(auth);
		expect(response.twoFactorRedirect).toBe(true);
		expect(response.twoFactorMethods).toEqual(["totp"]);
		expect(cookie).not.toMatch(/session_token=/);
		expect(cookie).toMatch(/two_factor=/);

		await expect(
			auth.api.verifyTOTP({ body: { code: "000000" }, headers: new Headers({ cookie }) }),
		).rejects.toThrow();

		const { headers, response: verified } = await auth.api.verifyTOTP({
			body: { code: totpFromURI(totpURI) },
			headers: new Headers({ cookie }),
			returnHeaders: true,
		});
		expect(verified.user.email).toBe(EMAIL);
		const session = await auth.api.getSession({
			headers: new Headers({ cookie: cookieHeader(headers) }),
			query: { disableCookieCache: true },
		});
		expect(session?.user.email).toBe(EMAIL);
	});

	it("accepts a backup code (once) when the authenticator is unavailable", async () => {
		const { auth } = await setupAdmin();
		const { backupCodes } = await enableAndVerify(auth);
		const code = backupCodes[0] as string;

		const first = await passwordChallenge(auth);
		const verified = await auth.api.verifyBackupCode({
			body: { code },
			headers: new Headers({ cookie: first.cookie }),
		});
		expect(verified.user.email).toBe(EMAIL);

		const second = await passwordChallenge(auth);
		await expect(
			auth.api.verifyBackupCode({
				body: { code },
				headers: new Headers({ cookie: second.cookie }),
			}),
		).rejects.toThrow();
	});

	it("disabling removes the secret and stops challenging sign-in", async () => {
		const { db, auth } = await setupAdmin();
		const { totpURI } = await enableAndVerify(auth);

		const challenge = await passwordChallenge(auth);
		const { headers } = await auth.api.verifyTOTP({
			body: { code: totpFromURI(totpURI) },
			headers: new Headers({ cookie: challenge.cookie }),
			returnHeaders: true,
		});
		await auth.api.disableTwoFactor({
			body: { password: PASSWORD },
			headers: new Headers({ cookie: cookieHeader(headers) }),
		});

		expect(await db.select().from(twoFactor)).toHaveLength(0);
		const { response } = await passwordChallenge(auth);
		expect(response.twoFactorRedirect).toBeUndefined();
	});

	it("is wiped with the admin (ON DELETE CASCADE, as danger.resetEverything relies on)", async () => {
		const { db, auth } = await setupAdmin();
		await enableAndVerify(auth);
		await db.delete(user);
		expect(await db.select().from(twoFactor)).toHaveLength(0);
	});
});

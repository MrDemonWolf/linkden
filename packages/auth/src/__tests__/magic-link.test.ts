import { account, verification } from "@linkden/db/schema/auth";
import { describe, expect, it } from "vitest";
import {
	EMAIL,
	linkFrom,
	PASSWORD,
	setSetting,
	setupAdmin,
	signInCookie,
	type TestAuth,
	totpFromURI,
} from "./auth-test-utils";

// Magic-link sign-in must only ever mail the single admin, only while the
// feature is on and 2FA is off, and must not cost the admin their password.

function requestLink(auth: TestAuth, email: string) {
	return auth.api.signInMagicLink({
		body: { email, callbackURL: "/admin" },
		headers: new Headers(),
	});
}

/** The `?error=` code a failed verify redirects with. */
async function verifyError(auth: TestAuth, token: string): Promise<string | null> {
	try {
		await auth.api.magicLinkVerify({ query: { token }, headers: new Headers() });
	} catch (e) {
		const location = (e as { headers?: Headers }).headers?.get("location");
		return location ? new URL(location).searchParams.get("error") : null;
	}
	throw new Error("magic-link verify unexpectedly succeeded");
}

function tokenFrom(url: string): string {
	const token = new URL(url).searchParams.get("token");
	if (!token) throw new Error(`no token in ${url}`);
	return token;
}

describe("magic link sign-in", () => {
	it("is refused while the feature is off, before any token is stored", async () => {
		const { db, auth, sent } = await setupAdmin();
		await expect(requestLink(auth, EMAIL)).rejects.toMatchObject({ status: "FORBIDDEN" });
		expect(await db.select().from(verification)).toHaveLength(0);
		expect(sent).toHaveLength(0);
	});

	it("says email isn't configured instead of pretending a link was sent", async () => {
		const { db, auth, sent } = await setupAdmin({ emailConfigured: false });
		await setSetting(db, "magic_link_enabled", "true");
		await expect(requestLink(auth, EMAIL)).rejects.toMatchObject({ status: "BAD_REQUEST" });
		expect(await db.select().from(verification)).toHaveLength(0);
		expect(sent).toHaveLength(0);
	});

	it("answers a stranger's address like a real send but stores and mails nothing", async () => {
		const { db, auth, sent } = await setupAdmin();
		await setSetting(db, "magic_link_enabled", "true");

		await expect(requestLink(auth, "victim@elsewhere.example")).resolves.toEqual({ status: true });
		expect(await db.select().from(verification)).toHaveLength(0);
		expect(sent).toHaveLength(0);
	});

	it("signs the admin in and keeps their password working", async () => {
		const { db, auth, sent } = await setupAdmin();
		await setSetting(db, "magic_link_enabled", "true");

		await expect(requestLink(auth, "Admin@Example.com")).resolves.toEqual({ status: true });
		expect(sent).toHaveLength(1);
		expect(sent[0]?.to).toBe("Admin@Example.com");
		expect(sent[0]?.html).toContain("expires in 10 minutes");

		const res = await auth.api.magicLinkVerify({
			query: { token: tokenFrom(linkFrom(sent[0])) },
			headers: new Headers(),
		});
		expect(res.user.email).toBe(EMAIL);

		// An unverified admin would have lost the credential account here.
		expect(await db.select().from(account)).toHaveLength(1);
		await expect(signInCookie(auth, PASSWORD)).resolves.toMatch(/session_token=/);
	});

	it("is off while 2FA is on, including links issued before 2FA was enabled", async () => {
		const { db, auth, sent } = await setupAdmin();
		await setSetting(db, "magic_link_enabled", "true");

		// Issued while 2FA was still off…
		await requestLink(auth, EMAIL);
		const staleLink = linkFrom(sent[0]);

		const cookie = await signInCookie(auth);
		const { totpURI } = await auth.api.enableTwoFactor({
			body: { password: PASSWORD },
			headers: new Headers({ cookie }),
		});
		await auth.api.verifyTOTP({
			body: { code: totpFromURI(totpURI) },
			headers: new Headers({ cookie }),
		});

		// …new requests are not mailed…
		await expect(requestLink(auth, EMAIL)).resolves.toEqual({ status: true });
		expect(sent).toHaveLength(1);

		// …and the old link no longer mints a session that would skip the TOTP step.
		expect(await verifyError(auth, tokenFrom(staleLink))).toBe("failed_to_create_session");
	});

	it("never creates an account from a magic link", async () => {
		const { auth } = await setupAdmin();
		// Even a token for an unknown address (minted past the send gate) is refused.
		const ctx = await auth.$context;
		await ctx.internalAdapter.createVerificationValue({
			identifier: "forged-token",
			value: JSON.stringify({ email: "new@elsewhere.example" }),
			expiresAt: new Date(Date.now() + 60_000),
		});
		expect(await verifyError(auth, "forged-token")).toBe("new_user_signup_disabled");
	});
});

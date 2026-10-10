// @vitest-environment node
// (jose, which signs the email-verification JWTs, rejects jsdom's Uint8Array.)
import { user } from "@linkden/db/schema/auth";
import { describe, expect, it } from "vitest";
import { EMAIL_NOT_CONFIGURED_MESSAGE } from "../auth-options";
import { EMAIL, linkFrom, setupAdmin, signInCookie, type TestAuth } from "./auth-test-utils";

// Settings › Account › Change email. Better Auth 1.6 needs
// emailVerification.sendVerificationEmail + changeEmail.sendChangeEmailConfirmation;
// without them /change-email always answered 400 while the UI said "sent".

const NEW_EMAIL = "owner@new.example";

async function followLink(auth: TestAuth, url: string, cookie?: string) {
	const token = new URL(url).searchParams.get("token");
	if (!token) throw new Error(`no token in ${url}`);
	return auth.api.verifyEmail({
		query: { token },
		headers: new Headers(cookie ? { cookie } : {}),
	});
}

describe("change email", () => {
	it("confirms from the current address, then verifies the new one before switching", async () => {
		const { db, auth, sent } = await setupAdmin();
		const cookie = await signInCookie(auth);

		await expect(
			auth.api.changeEmail({
				body: { newEmail: NEW_EMAIL, callbackURL: "/admin/settings" },
				headers: new Headers({ cookie }),
			}),
		).resolves.toEqual({ status: true });

		// Step 1: confirmation goes to the current mailbox; nothing changes yet.
		expect(sent.map((m) => m.to)).toEqual([EMAIL]);
		expect(sent[0]?.html).toContain(NEW_EMAIL);
		expect((await db.select().from(user))[0]?.email).toBe(EMAIL);

		// Step 2: confirming mails the new address.
		await followLink(auth, linkFrom(sent[0]), cookie);
		expect(sent.map((m) => m.to)).toEqual([EMAIL, NEW_EMAIL]);
		expect((await db.select().from(user))[0]?.email).toBe(EMAIL);

		// Step 3: verifying the new address switches it.
		await followLink(auth, linkFrom(sent[1]), cookie);
		const [admin] = await db.select().from(user);
		expect(admin?.email).toBe(NEW_EMAIL);
		expect(admin?.emailVerified).toBe(true);
	});

	it("fails loudly (instead of pretending to send) when email is not configured", async () => {
		const { db, auth } = await setupAdmin({ emailConfigured: false });
		const cookie = await signInCookie(auth);

		await expect(
			auth.api.changeEmail({
				body: { newEmail: NEW_EMAIL, callbackURL: "/admin/settings" },
				headers: new Headers({ cookie }),
			}),
		).rejects.toMatchObject({ message: EMAIL_NOT_CONFIGURED_MESSAGE });
		expect((await db.select().from(user))[0]?.email).toBe(EMAIL);
	});
});

import { describe, expect, it } from "vitest";
import { EMAIL, linkFrom, PASSWORD, setupAdmin, signInCookie } from "./auth-test-utils";

// Integration test for the password-reset flow the login page drives via
// authClient.requestPasswordReset. Uses a real in-memory DB + the production
// auth options (createAuthOptions), capturing the email sendResetPassword
// would send so we can complete the reset with its token.

const NEW_PASSWORD = "new-password-456";
const REDIRECT = "http://localhost:3000/admin/reset-password";

function tokenFrom(url: string): string {
	const fromQuery = new URL(url).searchParams.get("token");
	if (fromQuery) return fromQuery;
	const m = url.match(/reset-password\/([^/?]+)/);
	if (!m?.[1]) throw new Error(`no token in reset url: ${url}`);
	return m[1];
}

describe("password reset flow", () => {
	it("requests a reset email and completes the reset with the token", async () => {
		const { auth, sent } = await setupAdmin();
		await auth.api.requestPasswordReset({ body: { email: EMAIL, redirectTo: REDIRECT } });

		expect(sent).toHaveLength(1);
		expect(sent[0]?.to).toBe(EMAIL);
		const token = tokenFrom(linkFrom(sent[0]));
		expect(token).toBeTruthy();

		await auth.api.resetPassword({ body: { newPassword: NEW_PASSWORD, token } });

		// New password works.
		const ok = await auth.api.signInEmail({ body: { email: EMAIL, password: NEW_PASSWORD } });
		expect(ok.user.email).toBe(EMAIL);

		// Old password is rejected.
		await expect(
			auth.api.signInEmail({ body: { email: EMAIL, password: PASSWORD } }),
		).rejects.toThrow();
	});

	it("revokes every existing session (a stolen cookie dies with the reset)", async () => {
		const { auth, sent } = await setupAdmin();
		const stolen = await signInCookie(auth);

		await auth.api.requestPasswordReset({ body: { email: EMAIL, redirectTo: REDIRECT } });
		await auth.api.resetPassword({
			body: { newPassword: NEW_PASSWORD, token: tokenFrom(linkFrom(sent[0])) },
		});

		const session = await auth.api.getSession({
			headers: new Headers({ cookie: stolen }),
			query: { disableCookieCache: true },
		});
		expect(session).toBeNull();
	});

	it("does not leak whether an email exists (no send for unknown email)", async () => {
		const { auth, sent } = await setupAdmin();
		await auth.api.requestPasswordReset({
			body: { email: "nobody@example.com", redirectTo: REDIRECT },
		});
		expect(sent).toHaveLength(0);
	});

	it("answers the same when email delivery is not configured", async () => {
		const { auth } = await setupAdmin({ emailConfigured: false });
		await expect(
			auth.api.requestPasswordReset({ body: { email: EMAIL, redirectTo: REDIRECT } }),
		).resolves.toMatchObject({ status: true });
	});
});

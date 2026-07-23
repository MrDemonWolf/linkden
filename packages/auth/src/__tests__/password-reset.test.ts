import * as authSchema from "@linkden/db/schema/auth";
import { createTestDb } from "@linkden/db/testing";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { beforeEach, describe, expect, it } from "vitest";

// Integration test for the password-reset flow the login page drives via
// authClient.requestPasswordReset. Uses a real in-memory DB + a betterAuth
// instance configured like packages/auth, capturing the reset URL that
// sendResetPassword would email so we can complete the reset with the token.

const EMAIL = "admin@example.com";
const OLD_PASSWORD = "old-password-123";
const NEW_PASSWORD = "new-password-456";

function makeAuth(db: Awaited<ReturnType<typeof createTestDb>>["db"]) {
	let capturedUrl = "";
	const auth = betterAuth({
		database: drizzleAdapter(db, { provider: "sqlite", schema: authSchema }),
		emailAndPassword: {
			enabled: true,
			sendResetPassword: async ({ url }) => {
				capturedUrl = url;
			},
		},
		secret: "test-secret-0123456789-0123456789-0123456789",
		baseURL: "http://localhost:3000",
	});
	return { auth, getUrl: () => capturedUrl };
}

function tokenFrom(url: string): string {
	const fromQuery = new URL(url).searchParams.get("token");
	if (fromQuery) return fromQuery;
	const m = url.match(/reset-password\/([^/?]+)/);
	if (!m) throw new Error(`no token in reset url: ${url}`);
	return m[1];
}

describe("password reset flow", () => {
	let db: Awaited<ReturnType<typeof createTestDb>>["db"];
	let auth: ReturnType<typeof makeAuth>["auth"];
	let getUrl: ReturnType<typeof makeAuth>["getUrl"];

	beforeEach(async () => {
		({ db } = await createTestDb());
		({ auth, getUrl } = makeAuth(db));
		await auth.api.signUpEmail({
			body: { email: EMAIL, password: OLD_PASSWORD, name: "Admin" },
		});
	});

	it("requests a reset email and completes the reset with the token", async () => {
		await auth.api.requestPasswordReset({
			body: { email: EMAIL, redirectTo: "http://localhost:3000/admin/reset-password" },
		});

		const url = getUrl();
		const token = tokenFrom(url);
		expect(token).toBeTruthy();

		await auth.api.resetPassword({ body: { newPassword: NEW_PASSWORD, token } });

		// New password works.
		const ok = await auth.api.signInEmail({ body: { email: EMAIL, password: NEW_PASSWORD } });
		expect(ok.user.email).toBe(EMAIL);

		// Old password is rejected.
		await expect(
			auth.api.signInEmail({ body: { email: EMAIL, password: OLD_PASSWORD } }),
		).rejects.toThrow();
	});

	it("does not leak whether an email exists (no send for unknown email)", async () => {
		await auth.api.requestPasswordReset({
			body: {
				email: "nobody@example.com",
				redirectTo: "http://localhost:3000/admin/reset-password",
			},
		});
		expect(getUrl()).toBe("");
	});
});

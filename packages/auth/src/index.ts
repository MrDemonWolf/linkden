import { db } from "@linkden/db";
import * as schema from "@linkden/db/schema/auth";
import { siteSettings } from "@linkden/db/schema/index";
import { createResendEmailService } from "@linkden/email";
import { env } from "@linkden/env/server";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { magicLink, twoFactor } from "better-auth/plugins";

import { cookieAttributes, sessionOptions } from "./auth-options";
import { devLoginPlugin, isDevLoginEnabled } from "./dev-login";

export { getSessionQuery } from "./auth-options";

async function getEmailSettings() {
	const allRows = await db.select().from(siteSettings);
	const s: Record<string, string> = {};
	for (const row of allRows) {
		s[row.key] = row.value;
	}
	return {
		apiKey: s.email_api_key ?? "",
		from: s.email_from ?? "noreply@example.com",
	};
}

// Single Resend path (via packages/email) for every auth email.
async function sendAuthEmail(to: string, subject: string, html: string): Promise<void> {
	const { apiKey, from } = await getEmailSettings();
	if (!apiKey) {
		console.warn(`No email API key configured; skipping "${subject}" email`);
		return;
	}
	await createResendEmailService(apiKey, from).send({ to, subject, html });
}

export const auth = betterAuth({
	database: drizzleAdapter(db, {
		provider: "sqlite",

		schema: schema,
	}),
	trustedOrigins: [env.CORS_ORIGIN],
	emailAndPassword: {
		enabled: true,
		sendResetPassword: async ({ user, url }) => {
			await sendAuthEmail(
				user.email,
				"Reset your LinkDen password",
				`<p>Click the link below to reset your password:</p><p><a href="${url}">${url}</a></p><p>This link expires in 1 hour. If you didn't request this, ignore this email.</p>`,
			);
		},
	},
	user: {
		changeEmail: {
			enabled: true,
			sendChangeEmailVerification: async ({
				user,
				newEmail,
				url,
			}: {
				user: { email: string };
				newEmail: string;
				url: string;
			}) => {
				await sendAuthEmail(
					user.email,
					"Confirm your new LinkDen email",
					`<p>You requested to change your LinkDen email to <strong>${newEmail}</strong>.</p><p>Click the link below to confirm:</p><p><a href="${url}">${url}</a></p><p>If you didn't request this, ignore this email.</p>`,
				);
			},
		},
	},
	// Signed-cookie session cache for reads; see auth-options.ts for the
	// revocation trade-off and why mutations bypass it.
	session: sessionOptions,
	secret: env.BETTER_AUTH_SECRET,
	baseURL: env.BETTER_AUTH_URL,
	advanced: {
		// On Cloudflare Workers the real client IP is in cf-connecting-ip; the
		// default x-forwarded-for is client-spoofable. Point Better Auth's IP
		// resolution (used for rate-limit / security features) at the trusted header.
		ipAddress: {
			ipAddressHeaders: ["cf-connecting-ip"],
		},
		defaultCookieAttributes: cookieAttributes(env.BETTER_AUTH_URL),
	},
	plugins: [
		// DEV ONLY: the bypass-login endpoint (POST /api/auth/dev-login) exists only
		// when DEV_LOGIN === "true". Unset in prod → plugin unregistered → route 404s.
		...(isDevLoginEnabled((env as { DEV_LOGIN?: string }).DEV_LOGIN) ? [devLoginPlugin()] : []),
		twoFactor(),
		magicLink({
			sendMagicLink: async ({ email, url }) => {
				// Check if magic link sign-in is enabled
				const allRows = await db.select().from(siteSettings);
				const s: Record<string, string> = {};
				for (const row of allRows) {
					s[row.key] = row.value;
				}
				if (s.magic_link_enabled !== "true") {
					throw new Error("Magic link sign-in is disabled");
				}

				await sendAuthEmail(
					email,
					"Sign in to LinkDen",
					`<p>Click the link below to sign in to your LinkDen admin panel:</p><p><a href="${url}">${url}</a></p><p>This link expires in 10 minutes.</p>`,
				);
			},
		}),
	],
});

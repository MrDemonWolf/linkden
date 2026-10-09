import { db } from "@linkden/db";
import { readSettings } from "@linkden/db/settings-read";
import {
	createResendEmailService,
	EMAIL_TRANSPORT_SETTING_KEYS,
	resolveEmailTransport,
} from "@linkden/email";
import { env } from "@linkden/env/server";
import { betterAuth } from "better-auth";

import { type AuthEmail, authSecretProblem, createAuthOptions } from "./auth-options";

export { authSecretProblem, getSessionQuery } from "./auth-options";

/**
 * The same rule as the contact notification (resolveEmailTransport): Resend
 * only, with a key and a sender. Another provider's key is never sent to
 * Resend's API.
 */
async function getEmailTransport() {
	return resolveEmailTransport(await readSettings(db, EMAIL_TRANSPORT_SETTING_KEYS));
}

// Single Resend path (via packages/email) for every auth email. With no usable
// transport it only logs: reset and magic link must answer the same either way
// (the change-email flow checks isEmailConfigured up front instead).
async function sendAuthEmail({ to, subject, html }: AuthEmail): Promise<void> {
	const transport = await getEmailTransport();
	if (!transport) {
		console.error(
			`Auth email "${subject}" not sent: email delivery is not configured (Settings › Email: Resend API key and sender). Use \`bun reset:password\` to recover access without email.`,
		);
		return;
	}
	await createResendEmailService(transport.apiKey, transport.from).send({ to, subject, html });
}

async function isEmailConfigured(): Promise<boolean> {
	return (await getEmailTransport()) !== null;
}

const baseURL = env.BETTER_AUTH_URL;

/**
 * Why auth can't run (an empty, short or placeholder BETTER_AUTH_SECRET), or
 * null. The server answers 503 on every auth-dependent route while it is set
 * and /api/health reports it, so a misconfigured Worker stays diagnosable.
 */
export const authConfigProblem: string | null = authSecretProblem(env.BETTER_AUTH_SECRET, baseURL);

function buildAuth(secret: string) {
	return betterAuth(
		createAuthOptions({
			db,
			secret,
			baseURL,
			trustedOrigins: [env.CORS_ORIGIN],
			devLogin: (env as { DEV_LOGIN?: string }).DEV_LOGIN,
			sendEmail: sendAuthEmail,
			isEmailConfigured,
		}),
	);
}

type Auth = ReturnType<typeof buildAuth>;

/**
 * Stand-in while the secret is unusable: Better Auth is never constructed, so
 * its public default secret can't sign anything, and any use that slips past
 * the server's 503 guard throws (fails closed) instead of serving a session.
 * Not a module-scope throw, which would take /api/health down too.
 */
function unavailableAuth(reason: string): Auth {
	return new Proxy({} as Auth, {
		get() {
			throw new Error(`Authentication is unavailable: ${reason}`);
		},
	});
}

export const auth: Auth =
	authConfigProblem === null
		? buildAuth((env.BETTER_AUTH_SECRET ?? "").trim())
		: unavailableAuth(authConfigProblem);

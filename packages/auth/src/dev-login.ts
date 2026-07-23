import type { BetterAuthPlugin } from "better-auth";
import { APIError, createAuthEndpoint } from "better-auth/api";
import { setSessionCookie } from "better-auth/cookies";

/**
 * DEV-ONLY login bypass.
 *
 * Strictly gated: this plugin is only registered by packages/auth/src/index.ts
 * when the DEV_LOGIN env flag is exactly the string "true". In every other case
 * (undefined, "", "1", "TRUE", "false", …) the flag is off, the plugin is never
 * added, and POST /api/auth/dev-login returns 404. Production never sets
 * DEV_LOGIN, so the endpoint does not exist there.
 */
export function isDevLoginEnabled(flag?: string): boolean {
	return flag === "true";
}

/** Fixed identity used only when the local DB has no admin yet. */
const DEV_USER = {
	email: "dev@localhost",
	name: "Dev Admin",
	emailVerified: true,
} as const;

/**
 * A better-auth plugin exposing a single POST /dev-login endpoint that mints a
 * real, natively-signed better-auth session for the instance admin — no
 * email/password, no hand-forged cookie. Single-admin instance: if an admin
 * already exists we log in as that user; otherwise we create the fixed dev
 * identity. createSession fires the normal session hooks, exactly like a real
 * login.
 */
export function devLoginPlugin(): BetterAuthPlugin {
	return {
		id: "dev-login",
		endpoints: {
			devLogin: createAuthEndpoint("/dev-login", { method: "POST" }, async (ctx) => {
				const adapter = ctx.context.internalAdapter;

				// Single-admin instance — the sole existing user IS the admin.
				const [admin] = await adapter.listUsers(1, 0);
				const user = admin ?? (await adapter.createUser({ ...DEV_USER }));

				if (!user) {
					throw new APIError("INTERNAL_SERVER_ERROR", {
						message: "dev-login: failed to resolve a user",
					});
				}

				const session = await adapter.createSession(user.id, false);
				if (!session) {
					throw new APIError("INTERNAL_SERVER_ERROR", {
						message: "dev-login: failed to create a session",
					});
				}

				await setSessionCookie(ctx, { session, user });
				return ctx.json({ ok: true });
			}),
		},
	};
}

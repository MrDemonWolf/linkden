import type { BetterAuthPlugin } from "better-auth";
import { APIError, createAuthEndpoint, formCsrfMiddleware } from "better-auth/api";
import { setSessionCookie } from "better-auth/cookies";

const LOOPBACK_AUTHORITY = /^(?:localhost|127\.0\.0\.1|\[::1\])(?::\d{1,5})?$/i;
const LOOPBACK_IPS = new Set(["127.0.0.1", "::1", "[::1]", "::ffff:127.0.0.1"]);

/** Reject URL parser conveniences such as userinfo, encoded and numeric host aliases. */
function localHttpURL(value: string | undefined | null): URL | null {
	if (!value || /[\s\p{Cc}\\]/u.test(value)) return null;
	const authority = /^http:\/\/([^/?#]+)/i.exec(value)?.[1];
	if (!authority || !LOOPBACK_AUTHORITY.test(authority)) return null;
	try {
		const url = new URL(value);
		return url.protocol === "http:" ? url : null;
	} catch {
		return null;
	}
}

function localRequest(request: Request | undefined): boolean {
	if (!request) return false;
	const url = localHttpURL(request.url);
	const host = request.headers.get("host");
	if (!url || !host || !LOOPBACK_AUTHORITY.test(host)) return false;
	if (localHttpURL(`http://${host}`)?.origin !== url.origin) return false;

	const origin = request.headers.get("origin");
	if (origin && localHttpURL(origin)?.origin !== origin) return false;
	const referer = request.headers.get("referer");
	if (referer && !localHttpURL(referer)) return false;

	// A dev proxy must not turn an edge/tunnel request into a local login by
	// rewriting Host. These headers may deny access, never establish trust.
	if (request.headers.has("cf-ray") || request.headers.has("forwarded")) return false;
	for (const name of ["cf-connecting-ip", "x-forwarded-for", "x-real-ip"]) {
		const value = request.headers.get(name);
		if (value !== null && !value.split(",").every((ip) => LOOPBACK_IPS.has(ip.trim())))
			return false;
	}
	const forwardedHost = request.headers.get("x-forwarded-host");
	if (
		forwardedHost !== null &&
		!forwardedHost.split(",").every((h) => LOOPBACK_AUTHORITY.test(h.trim()))
	)
		return false;
	const forwardedProto = request.headers.get("x-forwarded-proto");
	return (
		forwardedProto === null || forwardedProto.split(",").every((proto) => proto.trim() === "http")
	);
}

/**
 * DEV-ONLY login bypass.
 *
 * Strictly gated by independent conditions, so one misconfiguration (say,
 * DEV_LOGIN=true added as a Worker variable while debugging) is not enough:
 *
 * 1. the DEV_LOGIN env flag is exactly the string "true" — undefined, "", "1",
 *    "TRUE", "false", … all mean off; and
 * 2. BETTER_AUTH_URL is plain http on a loopback host. Any https / tunnel /
 *    custom-domain base URL keeps it off.
 *
 * When either fails the plugin is never added and POST /api/auth/dev-login
 * returns 404. Production never sets DEV_LOGIN, so the endpoint does not exist
 * there. A present runtime mode must be development; Workers commonly leave
 * NODE_ENV unset, so it cannot establish locality. The request URL, Host,
 * Origin/Referer and proxy metadata must also remain local. First-login CSRF
 * checks still apply without a session cookie.
 */
export function isDevLoginEnabled(flag?: string, baseURL?: string, nodeEnv?: string): boolean {
	if (nodeEnv !== undefined && nodeEnv !== "development") return false;
	const url = localHttpURL(baseURL);
	return flag === "true" && !!url && !url.search && !url.hash;
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
			devLogin: createAuthEndpoint(
				"/dev-login",
				{ method: "POST", use: [formCsrfMiddleware] },
				async (ctx) => {
					const request = ctx.request;
					if (!localRequest(request)) {
						throw new APIError("NOT_FOUND");
					}
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
				},
			),
		},
	};
}

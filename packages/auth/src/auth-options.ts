// Env-free slice of the Better Auth config so the cookie-contract test can
// build its instance from the exact options production uses (index.ts pulls
// in cloudflare:workers + a live D1 binding, so it can't be imported there).

/**
 * Seconds the signed `session_data` cookie is trusted without a DB read.
 * Bounded low on purpose: a revoked or deleted session stays valid for at most
 * this long on GET requests. Mutations never use the cache (see
 * `getSessionQuery`), so admin writes are always checked against the DB.
 */
export const SESSION_COOKIE_CACHE_MAX_AGE = 60;

export const sessionOptions = {
	cookieCache: {
		enabled: true,
		maxAge: SESSION_COOKIE_CACHE_MAX_AGE,
	},
} as const;

/**
 * Web and API share one origin in production (API is routed under the site
 * domain), so host-only cookies are enough. A split-origin deploy would need
 * crossSubDomainCookies with a shared parent domain.
 */
export function cookieAttributes(baseURL: string | undefined) {
	return {
		sameSite: "lax",
		secure: !!baseURL?.startsWith("https"),
		httpOnly: true,
	} as const;
}

/**
 * `auth.api.getSession` query for a request: reads may use the cookie cache,
 * anything that can change state (tRPC mutations and uploads are POST) must
 * hit the session table so a factory reset / revoke takes effect immediately.
 */
export function getSessionQuery(method: string) {
	return { disableCookieCache: method.toUpperCase() !== "GET" };
}

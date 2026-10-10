/**
 * Admin routing rules shared by the edge proxy (`proxy.ts`), the admin shell
 * and the public page / OG route (session-cookie presence). Pure (no Next
 * imports) so it is unit-testable — see `__tests__/admin-routes.test.ts`.
 */

/**
 * Admin pages reachable without a session. The reset-password page is opened
 * from an emailed link by someone who is, by definition, signed out — gating it
 * would bounce them to login and drop the `?token=`. The admin manifest is
 * fetched without credentials (PWA install); it is static and secret-free.
 */
export const PUBLIC_ADMIN_ROUTES = [
	"/admin/login",
	"/admin/setup",
	"/admin/reset-password",
	"/admin/manifest.webmanifest",
] as const;

/** Exact match or a sub-path (`/admin/setup/…`) — never a prefix like `/admin/setupX`. */
export function isPublicAdminRoute(pathname: string): boolean {
	return PUBLIC_ADMIN_ROUTES.some(
		(route) => pathname === route || pathname.startsWith(`${route}/`),
	);
}

/** Better Auth session cookie names (plain on http dev, `__Secure-` on https). */
export const SESSION_COOKIE_NAMES = [
	"better-auth.session_token",
	"__Secure-better-auth.session_token",
] as const;

/**
 * Cheap presence check only — the cookie is NOT validated here. Use it to skip
 * work for visitors who certainly aren't signed in; real authorization stays
 * server-side (tRPC protectedProcedure / Better Auth).
 */
export function hasSessionCookie(cookies: { has(name: string): boolean }): boolean {
	return SESSION_COOKIE_NAMES.some((name) => cookies.has(name));
}

import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { legacyAdminRedirect } from "@/lib/admin-redirects";
import { hasSessionCookie, isPublicAdminRoute } from "@/lib/admin-routes";

// Lightweight edge proxy (Next.js 16 renamed middleware → proxy): checks for a
// session cookie on /admin/* routes. Full session validation is still enforced
// server-side by tRPC protectedProcedure. This prevents unauthenticated users
// from loading admin page bundles at the edge.

// Pages that must bypass the cookie gate (login, setup, the emailed
// reset-password link, the credential-less PWA manifest) live in one list,
// `PUBLIC_ADMIN_ROUTES` in lib/admin-routes.ts, shared with the admin shell.

/**
 * Edge proxy that protects all /admin/* routes.
 * 1. Legacy admin URLs (`/admin/builder`, `/admin/settings?tab=…`, …) get a real
 *    307 to their new route — before the auth gate, so `?from=` carries the
 *    canonical path and a legacy `?tab=` is not lost on the way to login.
 * 2. Checks for a Better Auth session cookie and redirects unauthenticated
 *    requests to /admin/login with a ?from= param so the user can return after
 *    signing in. Full session validation is still enforced server-side by tRPC
 *    protectedProcedure.
 */
export function proxy(request: NextRequest) {
	const { pathname, searchParams } = request.nextUrl;

	// Allow public admin routes through without auth check
	if (isPublicAdminRoute(pathname)) {
		return NextResponse.next();
	}

	const legacyTarget = legacyAdminRedirect(pathname, searchParams.get("tab"));
	if (legacyTarget) {
		return NextResponse.redirect(new URL(legacyTarget, request.url), 307);
	}

	// Check for Better Auth session cookie
	if (!hasSessionCookie(request.cookies)) {
		const loginUrl = new URL("/admin/login", request.url);
		// Pathname only (admin sub-pages are path segments): the login page
		// validates it with `safeAdminRedirect` (app/admin/login/redirect.ts) and
		// lands there after sign-in.
		loginUrl.searchParams.set("from", pathname);
		return NextResponse.redirect(loginUrl);
	}

	return NextResponse.next();
}

export const config = {
	matcher: ["/admin/:path*"],
};

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Lightweight edge proxy (Next.js 16 renamed middleware → proxy): checks for a
// session cookie on /admin/* routes. Full session validation is still enforced
// server-side by tRPC protectedProcedure. This prevents unauthenticated users
// from loading admin page bundles at the edge.

// The admin manifest is fetched by the browser without credentials (PWA
// install); it is static and secret-free, so it must bypass the cookie gate.
const PUBLIC_ADMIN_ROUTES = ["/admin/login", "/admin/setup", "/admin/manifest.webmanifest"];

/**
 * Edge proxy that protects all /admin/* routes.
 * Checks for a Better Auth session cookie and redirects unauthenticated requests
 * to /admin/login with a ?from= param so the user can return after signing in.
 * Full session validation is still enforced server-side by tRPC protectedProcedure.
 */
export function proxy(request: NextRequest) {
	const { pathname } = request.nextUrl;

	// Allow public admin routes through without auth check
	if (PUBLIC_ADMIN_ROUTES.some((route) => pathname === route || pathname.startsWith(`${route}/`))) {
		return NextResponse.next();
	}

	// Check for Better Auth session cookie
	const sessionCookie =
		request.cookies.get("better-auth.session_token") ??
		request.cookies.get("__Secure-better-auth.session_token");

	if (!sessionCookie) {
		const loginUrl = new URL("/admin/login", request.url);
		loginUrl.searchParams.set("from", pathname);
		return NextResponse.redirect(loginUrl);
	}

	return NextResponse.next();
}

export const config = {
	matcher: ["/admin/:path*"],
};

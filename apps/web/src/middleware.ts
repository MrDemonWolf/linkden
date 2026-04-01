import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Lightweight edge middleware: checks for session cookie presence on /admin/* routes.
// Full session validation is still enforced server-side by tRPC protectedProcedure.
// This prevents unauthenticated users from loading admin page bundles at the edge.

const PUBLIC_ADMIN_ROUTES = ["/admin/login", "/admin/setup"];

export function middleware(request: NextRequest) {
	const { pathname } = request.nextUrl;

	// Allow public admin routes through without auth check
	if (PUBLIC_ADMIN_ROUTES.some((route) => pathname.startsWith(route))) {
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

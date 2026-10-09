import { isPublicAdminRoute } from "@/lib/admin-routes";

const FALLBACK = "/admin";

/**
 * Where to land after sign-in. proxy.ts puts the requested pathname in
 * `?from=`; accept it only when it is a plain in-app admin path — no scheme,
 * no protocol-relative `//host`, no backslash tricks, no query or fragment —
 * so the login page can never become an open redirect.
 */
export function safeAdminRedirect(from: string | null | undefined): string {
	if (!from) return FALLBACK;
	if (!/^\/admin(?:\/[A-Za-z0-9_-]+)*\/?$/.test(from)) return FALLBACK;
	const path = from.length > 1 && from.endsWith("/") ? from.slice(0, -1) : from;
	// The public admin pages (login, setup, reset-password) would bounce a
	// freshly signed-in admin straight back out.
	if (isPublicAdminRoute(path)) return FALLBACK;
	return path;
}

/** Reads `?from=` from the current URL (client only). */
export function postLoginTarget(): string {
	if (typeof window === "undefined") return FALLBACK;
	return safeAdminRedirect(new URLSearchParams(window.location.search).get("from"));
}

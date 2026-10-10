// ─── Origin checks ──────────────────────────────────────────────────────────
// CORS only decides whether a browser may READ a cross-origin response; it does
// not stop a same-site sibling origin from sending a cookie-authenticated POST.
// State-changing requests to /trpc/* and /api/upload must therefore come from
// the site's own origin. Better Auth enforces the same for /api/auth/* itself.

const DEFAULT_ORIGIN = "http://localhost:3001";

/** The configured site origin (CORS_ORIGIN), normalized to scheme://host[:port]. */
export function allowedOrigin(corsOrigin: string | undefined): string {
	const raw = corsOrigin || DEFAULT_ORIGIN;
	try {
		return new URL(raw).origin;
	} catch {
		return raw;
	}
}

/**
 * True when a state-changing request may proceed. A present `Origin` must be
 * the site origin (or the request's own origin, for a single-origin deploy);
 * without one, a browser's `Sec-Fetch-Site` must say same-origin or
 * user-initiated. Requests carrying neither header are not from a browser (the
 * web worker's service binding, curl) and cannot ride the admin's cookies.
 */
export function isTrustedRequestOrigin(opts: {
	origin: string | undefined;
	secFetchSite: string | undefined;
	allowed: string;
	self: string;
}): boolean {
	const { origin, secFetchSite, allowed, self } = opts;
	if (origin) return origin === allowed || origin === self;
	if (secFetchSite) return secFetchSite === "same-origin" || secFetchSite === "none";
	return true;
}

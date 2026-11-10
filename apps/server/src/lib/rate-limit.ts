// ─── Rate-limit keys + tRPC procedure parsing ───────────────────────────────
// Pure helpers behind the limiter middleware in ../index.ts.

export { rateLimitKey } from "@linkden/validators/rate-limit";

const trimSlashes = (path: string) => {
	const start = path.startsWith("/") ? path.slice(1) : path;
	return start.endsWith("/") ? start.slice(0, -1) : start;
};

/**
 * The procedure paths a tRPC request will resolve, parsed exactly like
 * @trpc/server's fetch adapter does (trim one slash each side, decode, split
 * on "," only for `?batch=1`). URL-prefix matching can't see past the first
 * name in `/trpc/a,b,c?batch=1`, so limiters and body limits key off this list.
 * Returns null when the path can't be decoded (tRPC rejects it too).
 */
export function trpcProcedurePaths(url: URL, endpoint = "/trpc"): string[] | null {
	const pathname = trimSlashes(url.pathname);
	const path = trimSlashes(pathname.slice(trimSlashes(endpoint).length));
	let decoded: string;
	try {
		decoded = decodeURIComponent(path);
	} catch {
		return null;
	}
	return url.searchParams.get("batch") === "1" ? decoded.split(",") : [decoded];
}

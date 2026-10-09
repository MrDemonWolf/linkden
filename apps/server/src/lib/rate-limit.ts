// ─── Rate-limit keys + tRPC procedure parsing ───────────────────────────────
// Pure helpers behind the limiter middleware in ../index.ts.

const IPV4_TAIL = /\d{1,3}(?:\.\d{1,3}){3}$/;
const HEXTET = /^[0-9a-f]{1,4}$/;

/** Expand an IPv6 address to its eight hextets (normalized), or null if malformed. */
function expandIpv6(ip: string): string[] | null {
	// Drop a zone id and turn an embedded IPv4 tail into two (ignored) hextets.
	const addr = (ip.toLowerCase().split("%")[0] ?? "").replace(IPV4_TAIL, "0:0");
	const halves = addr.split("::");
	if (halves.length > 2) return null;
	const head = halves[0] ? halves[0].split(":") : [];
	const tail = halves.length === 2 && halves[1] ? halves[1].split(":") : [];
	const missing = 8 - head.length - tail.length;
	if (halves.length === 1 ? missing !== 0 : missing < 1) return null;
	const groups = [...head, ...Array<string>(halves.length === 2 ? missing : 0).fill("0"), ...tail];
	if (!groups.every((g) => HEXTET.test(g))) return null;
	return groups.map((g) => Number.parseInt(g, 16).toString(16));
}

/**
 * Limiter key for a client IP (`cf-connecting-ip`). IPv4 keys on the full
 * address. IPv6 keys on the /64 prefix: one host normally controls a whole /64
 * and could otherwise rotate source addresses to get a fresh bucket per request.
 */
export function rateLimitKey(ip: string | null | undefined): string {
	const raw = (ip ?? "").trim();
	if (!raw.includes(":")) return raw;
	const mapped = /^::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/i.exec(raw);
	if (mapped?.[1]) return mapped[1];
	const groups = expandIpv6(raw);
	return groups ? `${groups.slice(0, 4).join(":")}::/64` : raw.toLowerCase();
}

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

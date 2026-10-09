/**
 * Abuse/analytics metadata derived from *trusted* server-side request headers
 * (Cloudflare-populated) rather than spoofable client input. On Cloudflare
 * Workers, `cf-connecting-ip` and `cf-ipcountry` are set by the edge and cannot
 * be forged by the client.
 *
 * The user agent is deliberately not collected (nothing reads it — GDPR data
 * minimisation), and the `Referer` header is not used for analytics: on the
 * tracking fetch it is the link page itself, never where the visitor came from.
 * See `referrerHost` for the one client-supplied analytics field.
 */
export function requestMeta(headers: Headers): {
	ip: string;
	country: string | null;
} {
	const country = headers.get("cf-ipcountry");
	return {
		ip: headers.get("cf-connecting-ip") ?? "",
		// CF uses "XX" / "T1" for unknown/Tor — normalize those to null.
		country: country && country !== "XX" && country !== "T1" ? country : null,
	};
}

const MAX_HOST_LENGTH = 255;

/** Lowercased hostname of a URL or `host[:port]` value, or null if unparseable. */
function hostnameOf(value: string | null | undefined): string | null {
	if (!value) return null;
	try {
		const url = new URL(value.includes("://") ? value : `http://${value}`);
		return url.hostname.toLowerCase() || null;
	} catch {
		return null;
	}
}

/**
 * Hostnames that identify this site: the request's own `Host` plus the
 * configured web origin (they differ on split-origin dev/staging deploys).
 */
export function ownHostnames(headers: Headers, siteOrigin?: string | null): string[] {
	return [hostnameOf(headers.get("host")), hostnameOf(siteOrigin)].filter((h): h is string => !!h);
}

/**
 * Reduce a client-reported `document.referrer` to its hostname — never a path
 * or query string (no fbclid/utm/gclid ids are stored). Referrer is the one
 * client-supplied analytics field: it is display-only, so spoofing it only
 * skews the owner's own stats. Returns null for empty, unparseable or
 * non-http(s) values and for the site's own hosts, so internal navigation and
 * reloads count as Direct.
 */
export function referrerHost(
	raw: string | null | undefined,
	ownHosts: readonly string[],
): string | null {
	if (!raw) return null;
	let url: URL;
	try {
		url = new URL(raw);
	} catch {
		return null;
	}
	if (url.protocol !== "http:" && url.protocol !== "https:") return null;
	const host = url.hostname.toLowerCase();
	if (!host || ownHosts.includes(host)) return null;
	return host.slice(0, MAX_HOST_LENGTH);
}

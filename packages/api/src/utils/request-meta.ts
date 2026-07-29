import { truncateUserAgent } from "./sanitize";

/**
 * Analytics/abuse metadata derived from *trusted* server-side request headers
 * (Cloudflare-populated) rather than spoofable client input. On Cloudflare
 * Workers, `cf-connecting-ip` and `cf-ipcountry` are set by the edge and cannot
 * be forged by the client; `user-agent`/`referer` are the real request headers.
 */
export function requestMeta(headers: Headers): {
	ip: string;
	country: string | null;
	userAgent: string | null;
	referrer: string | null;
} {
	const country = headers.get("cf-ipcountry");
	return {
		ip: headers.get("cf-connecting-ip") ?? "",
		// CF uses "XX" / "T1" for unknown/Tor — normalize those to null.
		country: country && country !== "XX" && country !== "T1" ? country : null,
		userAgent: truncateUserAgent(headers.get("user-agent") ?? undefined) ?? null,
		referrer: headers.get("referer")?.slice(0, 2048) ?? null,
	};
}

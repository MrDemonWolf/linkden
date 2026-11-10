/**
 * Request metadata derived from *trusted* server-side request headers
 * (Cloudflare-populated) rather than spoofable client input. On Cloudflare
 * Workers, `cf-connecting-ip` and `cf-ipcountry` are set by the edge and cannot
 * be forged by the client.
 *
 * CAPTCHA uses the IP address. User agent and Referer are not collected.
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

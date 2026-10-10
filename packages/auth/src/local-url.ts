// Loopback detection shared by the dev-login gate and the auth-secret check.
// "Local" means plain http on a loopback host: what `bun dev` uses. Anything
// else (https, a tunnel hostname, a custom domain) is treated as deployed.

const LOOPBACK_HOSTNAMES = new Set(["localhost", "127.0.0.1", "[::1]", "::1"]);

export function isLoopbackHostname(hostname: string): boolean {
	return LOOPBACK_HOSTNAMES.has(hostname.toLowerCase());
}

/** True only for an `http://` URL whose host is loopback. */
export function isLocalHttpURL(url: string | undefined): boolean {
	if (!url) return false;
	try {
		const parsed = new URL(url);
		return parsed.protocol === "http:" && isLoopbackHostname(parsed.hostname);
	} catch {
		return false;
	}
}

/** True when a `Host` header value (`name[:port]`) names a loopback host. */
export function isLoopbackHostHeader(host: string | null | undefined): boolean {
	if (!host) return false;
	try {
		return isLoopbackHostname(new URL(`http://${host}`).hostname);
	} catch {
		return false;
	}
}

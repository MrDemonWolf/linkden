function customHostname(hostname: string): boolean {
	return (
		hostname.includes(".") &&
		!hostname.endsWith(".") &&
		hostname !== "workers.dev" &&
		!hostname.endsWith(".workers.dev") &&
		!hostname.endsWith(".localhost") &&
		!/^[\d.]+$/.test(hostname) &&
		!hostname.startsWith("[")
	);
}

/** Strict deployment ingress; the public profile and explicit API action may use separate hosts. */
export function validatePublicContactUrl(
	value: string | undefined,
	publicSiteURL: string | undefined,
): string | null {
	if (!value || !publicSiteURL) return null;
	try {
		const site = new URL(publicSiteURL);
		const endpoint = new URL(value);
		if (
			site.protocol !== "https:" ||
			site.origin !== publicSiteURL ||
			site.port ||
			!customHostname(site.hostname) ||
			endpoint.protocol !== "https:" ||
			endpoint.href !== value ||
			!customHostname(endpoint.hostname) ||
			endpoint.username ||
			endpoint.password ||
			endpoint.port ||
			endpoint.pathname !== "/api/contact" ||
			endpoint.search ||
			endpoint.hash
		)
			return null;
		return endpoint.href;
	} catch {
		return null;
	}
}

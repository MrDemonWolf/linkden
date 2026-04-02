/**
 * Strip all HTML tags from a string to prevent stored XSS.
 * Uses a multi-pass approach: decode common HTML entities first, then strip tags,
 * to catch obfuscated payloads like &lt;script&gt;.
 */
export function stripHtml(str: string): string {
	// Decode common HTML entities that could be used to smuggle tags
	const decoded = str
		.replace(/&lt;/gi, "<")
		.replace(/&gt;/gi, ">")
		.replace(/&#x3C;/gi, "<")
		.replace(/&#60;/gi, "<")
		.replace(/&#x3E;/gi, ">")
		.replace(/&#62;/gi, ">");
	// Strip all remaining HTML tags
	return decoded.replace(/<[^>]*>/g, "");
}

/**
 * Extract a short browser identifier from a User-Agent string.
 * Stores only the browser family and major version instead of the full UA
 * to reduce fingerprinting potential (GDPR data minimisation, Art. 5(1)(c)).
 * Returns null if the input is falsy.
 */
export function truncateUserAgent(ua?: string): string | null {
	if (!ua) return null;
	const match = ua.match(/(Edg\/|EdgA\/|EdgiOS\/|Chrome|Firefox|Safari|Edge|Opera|OPR|MSIE|Trident)[/\s]?(\d+)/i);
	if (match?.[1] && match[2]) {
		const token = match[1].replace("/", "");
		const browser = token === "OPR" ? "Opera" : token.startsWith("Edg") ? "Edge" : token;
		return `${browser}/${match[2]}`;
	}
	return "Other";
}

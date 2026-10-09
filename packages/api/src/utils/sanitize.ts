/**
 * Sanitize a URL by rejecting non-http(s) schemes (e.g. javascript:, data:).
 * Returns an empty string for invalid or unparseable URLs.
 */
export function sanitizeUrl(url: string): string {
	if (!url) return url;
	try {
		const parsed = new URL(url);
		if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
			return "";
		}
		return url;
	} catch {
		// Reject unparseable URLs — could be javascript: or data: schemes
		return "";
	}
}

// Real tag syntax only: `<` + optional `/` + a letter-led tag name, then either
// `>` or whitespace / `/` before the attributes. Plain-text uses of angle
// brackets (`<jane@corp.com>`, `x < 5 and y > 3`, `<3`) do not match.
const TAG_RE = /<\/?[a-z][a-z0-9-]*(?:[\s/][^>]*)?>/gi;

/**
 * Remove HTML tags from plain-text input as a defence-in-depth layer. Every sink
 * (React, React Email) already escapes output, so this only strips real markup
 * and never rewrites text: entities are NOT decoded first (`&lt;3` stays as
 * typed) and angle brackets that are not tag syntax survive untouched.
 * Repeats until stable so a split tag (`<scr<b>ipt>`) cannot reassemble.
 */
export function stripHtml(str: string): string {
	let out = str;
	let prev: string;
	do {
		prev = out;
		out = out.replace(TAG_RE, "");
	} while (out !== prev);
	return out;
}

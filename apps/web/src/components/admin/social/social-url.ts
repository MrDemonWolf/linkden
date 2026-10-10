import { getPrefix, getSuffix, isFullUrlTemplate } from "@/lib/social-url-utils";

// Username-mode social rows store `prefix + handle + suffix` from the brand's
// `urlTemplate` (e.g. "https://x.com/{}"). Admins paste whole profile URLs and
// "@handles" into that box, and the Add dialog accepts any http(s) URL, so both
// directions have to recognise the same profile written a few different ways.

const SCHEME = /^https?:\/\//i;
const SCHEME_WWW = /^https?:\/\/(?:www\.)?/i;

/** A handle is non-empty and never a URL in its own right. */
function isHandle(value: string): boolean {
	return value !== "" && !value.includes("://");
}

/**
 * The handle inside `url` for `template`, or null when `url` is not a profile
 * URL of that network. Accepts http/https, a leading `www.`, any host casing
 * and a trailing slash.
 */
export function handleFromUrl(url: string, template: string): string | null {
	if (!url || isFullUrlTemplate(template)) return null;
	const prefix = getPrefix(template);
	const suffix = getSuffix(template);

	// The canonical form buildSocialUrl writes. Sliced verbatim so a handle that
	// is still being typed (a trailing "/" included) round-trips unchanged.
	if (
		url.length >= prefix.length + suffix.length &&
		url.startsWith(prefix) &&
		url.endsWith(suffix)
	) {
		const handle = url.slice(prefix.length, url.length - suffix.length);
		if (isHandle(handle)) return handle;
	}

	// Another spelling of the same profile URL.
	if (!SCHEME.test(url)) return null;
	const bareUrl = url.replace(SCHEME_WWW, "");
	const barePrefix = prefix.replace(SCHEME_WWW, "");
	// A template that is only a scheme would match every URL.
	if (!barePrefix && !suffix) return null;
	if (!bareUrl.toLowerCase().startsWith(barePrefix.toLowerCase())) return null;
	let handle = bareUrl.slice(barePrefix.length).replace(/\/+$/, "");
	if (suffix) {
		if (!handle.toLowerCase().endsWith(suffix.toLowerCase())) return null;
		handle = handle.slice(0, handle.length - suffix.length);
	}
	return isHandle(handle) ? handle : null;
}

/**
 * What the username box shows for a stored URL: the handle when the URL belongs
 * to this network, otherwise the whole URL, so a foreign or malformed value is
 * visible instead of hiding behind the prefix.
 */
export function extractSocialHandle(url: string, template: string): string {
	if (!url || isFullUrlTemplate(template)) return url;
	return handleFromUrl(url, template) ?? url;
}

/**
 * The URL to store for what was typed or pasted. A pasted profile URL of this
 * network is reduced to its handle and rebuilt canonically; any other http(s)
 * URL is kept as-is rather than nested inside the template. A leading "@" (and
 * the template's own sigil, e.g. cash.app's "$") is dropped from a bare handle
 * so "@ada" never becomes ".../@@ada".
 */
export function buildSocialUrl(input: string, template: string): string {
	const value = input.trim();
	if (!value || isFullUrlTemplate(template)) return value;
	const prefix = getPrefix(template);
	const suffix = getSuffix(template);

	if (SCHEME.test(value)) {
		const handle = handleFromUrl(value, template);
		return handle === null ? value : `${prefix}${handle}${suffix}`;
	}

	let handle = value.replace(/^@+/, "");
	if (prefix.endsWith("$")) handle = handle.replace(/^\$+/, "");
	return handle ? `${prefix}${handle}${suffix}` : "";
}

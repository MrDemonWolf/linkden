/**
 * Defence in depth for the public renderers: stored block URLs are validated
 * on write (httpUrlSchema), but the page renders rows verbatim, so anything
 * that is not http(s) is dropped here rather than emitted as an href/src.
 */
export function safeHttpUrl(value: unknown): string | null {
	if (typeof value !== "string" || !value) return null;
	try {
		const { protocol } = new URL(value);
		return protocol === "http:" || protocol === "https:" ? value : null;
	} catch {
		return null;
	}
}

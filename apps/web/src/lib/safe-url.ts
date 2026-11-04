/**
 * Defence in depth for the public renderers: stored block URLs are validated
 * on write (httpUrlSchema), but the page renders rows verbatim, so anything
 * that is not http(s) is dropped here rather than emitted as an href/src.
 */
import { UPLOADED_IMAGE_PATH } from "@linkden/validators/primitives";

export function safeHttpUrl(value: unknown): string | null {
	if (typeof value !== "string" || !value) return null;
	try {
		const { protocol } = new URL(value);
		return protocol === "http:" || protocol === "https:" ? value : null;
	} catch {
		return null;
	}
}

/**
 * An image `src`: an uploaded image's origin-relative path, else an http(s)
 * URL. A legacy absolute upload URL (stored before uploads were saved as
 * paths, on whatever origin the API had then) is reduced to its path so it
 * loads from this site's origin.
 */
export function safeImageSrc(value: unknown): string | null {
	if (typeof value !== "string" || !value) return null;
	if (UPLOADED_IMAGE_PATH.test(value)) return value;
	const url = safeHttpUrl(value);
	if (!url) return null;
	const { pathname, search, hash } = new URL(url);
	return UPLOADED_IMAGE_PATH.test(pathname) && !search && !hash ? pathname : url;
}

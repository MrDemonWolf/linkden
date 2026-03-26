/**
 * Strip all HTML tags from a string to prevent stored XSS.
 */
export function stripHtml(str: string): string {
	return str.replace(/<[^>]*>/g, "");
}

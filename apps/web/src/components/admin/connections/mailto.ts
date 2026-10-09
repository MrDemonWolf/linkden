/**
 * `mailto:` href for one stored address. Everything but "@" is percent-encoded,
 * so a value like "a@b.com?bcc=x@evil.com" (e.g. from a crafted backup) stays a
 * single, invalid recipient instead of adding a Bcc/Subject to the reply.
 */
export function mailtoHref(email: string): string {
	return `mailto:${encodeURIComponent(email).replace(/%40/g, "@")}`;
}

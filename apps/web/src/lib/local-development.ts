const LOOPBACK_AUTHORITY = /^(?:localhost|127\.0\.0\.1|\[::1\])(?::\d{1,5})?$/i;

/** Reject aliases, credentials and parser-normalized hostnames before URL parsing. */
export function localHttpUrl(value: string | undefined | null): URL | null {
	if (!value || /[\s\p{Cc}\\]/u.test(value)) return null;
	const authority = /^http:\/\/([^/?#]+)/i.exec(value)?.[1];
	if (!authority || !LOOPBACK_AUTHORITY.test(authority)) return null;
	try {
		return new URL(value);
	} catch {
		return null;
	}
}

/** Explicit local transports take only a bare origin, optionally ending in one slash. */
export function localHttpOrigin(value: string | undefined | null): URL | null {
	return value && /^http:\/\/[^/?#]+\/?$/i.test(value) ? localHttpUrl(value) : null;
}

/** UI-only guard; the API independently enforces its development-login boundary. */
export function isLocalDevelopmentUrl(url: string) {
	return process.env.NODE_ENV === "development" && localHttpUrl(url) !== null;
}

// ─── Structured logging ─────────────────────────────────────────────────────
// Every error path (Hono, tRPC, cron, health) logs one JSON line so Workers
// observability can filter on `level` / `path`. Request lines carry the path
// only: query strings and token-bearing segments never reach the logs.

// Drizzle wraps driver errors in DrizzleQueryError, whose message is
// `Failed query: <sql>\nparams: <values>`. The bound values are visitor data
// (contact-form name/email/message, analytics UA/referrer), so everything from
// the params marker on is cut from the message and the stack.
const PARAMS_MARKER = "\nparams:";

function redactParams(text: string): string {
	const i = text.indexOf(PARAMS_MARKER);
	return i === -1 ? text : text.slice(0, i);
}

function queryOf(err: Error): string | undefined {
	const query = (err as { query?: unknown }).query;
	return typeof query === "string" ? query : undefined;
}

/** Loggable fields for an error, with bound query parameters removed. */
export function describeError(err: unknown): Record<string, unknown> {
	const e = err instanceof Error ? err : new Error(String(err));
	const message = redactParams(e.message);
	let stack = e.stack;
	if (stack !== undefined && message !== e.message) {
		// V8 stacks start with `${name}: ${message}`; swap in the redacted
		// message, and drop the stack entirely if the header looks different.
		const header = `${e.name}: ${e.message}`;
		stack = stack.startsWith(header)
			? `${e.name}: ${message}${stack.slice(header.length)}`
			: undefined;
	}
	const fields: Record<string, unknown> = { message, stack };
	const query = queryOf(e);
	if (query) fields.query = query;
	if (e.cause !== undefined) {
		fields.cause = redactParams(e.cause instanceof Error ? e.cause.message : String(e.cause));
	}
	return fields;
}

/** One-line JSON error log, shared by the Hono, tRPC, cron, and health paths. */
export function logError(fields: Record<string, unknown>, err: unknown): void {
	console.error(JSON.stringify({ level: "error", ...fields, ...describeError(err) }));
}

// Better Auth's only route with a bearer token in the path is the password
// reset callback (`/reset-password/:token`). Magic-link / verify-email tokens
// travel in the query string, which is never logged.
const TOKEN_PATH_PREFIXES = ["/api/auth/reset-password/"];

/** The request path as it may appear in logs: no query, no token segments. */
export function redactLogPath(pathname: string): string {
	for (const prefix of TOKEN_PATH_PREFIXES) {
		if (pathname.startsWith(prefix) && pathname.length > prefix.length) {
			return `${prefix}[redacted]`;
		}
	}
	return pathname;
}

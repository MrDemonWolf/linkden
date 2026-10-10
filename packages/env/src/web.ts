// Public (NEXT_PUBLIC_*) env for the web app.
//
// Deliberately schema-library-free: client code on every route imports this
// (tRPC client, auth client, click tracking), and t3-env + zod here shipped all
// of zod (~90 KB gzip) to every page just to re-check two URLs. Validation still
// runs at import time, and next.config.ts imports this module, so a bad value
// fails the build exactly as before.
//
// The reads must stay literal `process.env.NEXT_PUBLIC_*` expressions: Next only
// inlines those into the client bundle, never dynamic lookups.

function fail(name: string, problem: string): never {
	throw new Error(`❌ Invalid environment variables: ${name} ${problem}`);
}

/** Empty string counts as unset (an unset GitHub variable arrives as ""). */
function blankToUndefined(value: string | undefined): string | undefined {
	return value === "" ? undefined : value;
}

function requireUrl(name: string, value: string | undefined): string {
	if (value === undefined) fail(name, "is required");
	try {
		new URL(value);
	} catch {
		fail(name, `must be a valid URL (got ${JSON.stringify(value)})`);
	}
	return value;
}

const skipValidation = !!process.env.SKIP_ENV_VALIDATION;

const rawServerUrl = blankToUndefined(process.env.NEXT_PUBLIC_SERVER_URL);
// Public origin of the web app — used for metadataBase, robots, sitemap (the API
// origin is the wrong base for those on a split deployment). The localhost
// default is dev-only: a production build must be told its origin, or
// robots/sitemap/OG URLs would silently point at localhost.
const rawSiteUrl =
	blankToUndefined(process.env.NEXT_PUBLIC_SITE_URL) ??
	(process.env.NODE_ENV === "production" ? undefined : "http://localhost:3001");

export const env: Readonly<{ NEXT_PUBLIC_SERVER_URL: string; NEXT_PUBLIC_SITE_URL: string }> =
	Object.freeze(
		skipValidation
			? {
					NEXT_PUBLIC_SERVER_URL: rawServerUrl as string,
					NEXT_PUBLIC_SITE_URL: rawSiteUrl as string,
				}
			: {
					NEXT_PUBLIC_SERVER_URL: requireUrl("NEXT_PUBLIC_SERVER_URL", rawServerUrl),
					NEXT_PUBLIC_SITE_URL: requireUrl("NEXT_PUBLIC_SITE_URL", rawSiteUrl),
				},
	);

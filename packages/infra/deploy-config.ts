// Pure deploy-time rules for alchemy.run.ts, kept free of Alchemy imports so
// they can be unit-tested (packages/infra/__tests__). alchemy.run.ts runs under
// Node's type stripping, so this file must stay erasable TypeScript only (no
// enums, no parameter properties, type-only imports marked `import type`).

type Env = Record<string, string | undefined>;

/** Better Auth's built-in fallback secret. It is public, so never acceptable. */
export const BETTER_AUTH_DEFAULT_SECRET = "better-auth-secret-12345678901234567890";
export const MIN_AUTH_SECRET_LENGTH = 32;

export interface ResourceNames {
	db: string;
	images: string;
	backups: string;
	/** Upgrade overrides that were set but ignored because the stage is not prod. */
	ignoredOverrides: string[];
}

/**
 * Physical D1/R2 names for a stage. Any stage other than prod gets a suffix, so
 * a throwaway `ALCHEMY_STAGE=dev` deploy is independent instead of adopting —
 * and on destroy, deleting — the production database and buckets.
 *
 * LINKDEN_DB_NAME / LINKDEN_IMAGES_BUCKET point the prod stage at resources a
 * pre-0.5.0 deploy created under generated names. They are honoured on the prod
 * stage ONLY: the docs tell upgraders to put them in .env, which every later
 * run loads, and a dev stage that honoured them would adopt the production
 * database (and delete it on `ALCHEMY_STAGE=dev bun run destroy`).
 */
export function resolveResourceNames(stage: string, env: Env): ResourceNames {
	const isProd = stage === "prod";
	const suffix = isProd ? "" : `-${stage}`;
	const dbOverride = env.LINKDEN_DB_NAME?.trim() || undefined;
	const imagesOverride = env.LINKDEN_IMAGES_BUCKET?.trim() || undefined;
	const ignoredOverrides: string[] = [];
	if (!isProd && dbOverride) ignoredOverrides.push("LINKDEN_DB_NAME");
	if (!isProd && imagesOverride) ignoredOverrides.push("LINKDEN_IMAGES_BUCKET");
	return {
		db: (isProd && dbOverride) || `linkden-db${suffix}`,
		images: (isProd && imagesOverride) || `linkden-images${suffix}`,
		backups: `linkden-backups${suffix}`,
		ignoredOverrides,
	};
}

function parsedOrigin(value: string): string | undefined {
	try {
		return new URL(value).origin;
	} catch {
		return undefined;
	}
}

function httpsUrlError(name: string, value: string): string | undefined {
	let url: URL;
	try {
		url = new URL(value);
	} catch {
		return `${name} (${value}) is not a valid URL.`;
	}
	if (url.protocol !== "https:") return `${name} (${value}) must be an https:// URL.`;
	return undefined;
}

/**
 * Everything wrong with the values the deployed Workers need, all at once (an
 * empty list means the deploy may proceed).
 *
 * An unset GitHub secret arrives as "" — not undefined — and `alchemy.env`
 * passes "" through silently. An empty BETTER_AUTH_SECRET would make Better
 * Auth sign sessions with its public default secret (it only refuses that when
 * NODE_ENV is "production", which the Worker never sets), an empty
 * BETTER_AUTH_URL drops the `secure` cookie flag, and an empty CORS_ORIGIN makes
 * the server fall back to localhost. So refuse them here, by name.
 */
export function deployEnvErrors(env: Env): string[] {
	const errors: string[] = [];
	const required = [
		"BETTER_AUTH_SECRET",
		"BETTER_AUTH_URL",
		"CORS_ORIGIN",
		"NEXT_PUBLIC_SERVER_URL",
		"NEXT_PUBLIC_SITE_URL",
	] as const;
	const values: Partial<Record<(typeof required)[number], string>> = {};
	for (const name of required) {
		const value = env[name];
		if (!value?.trim()) {
			errors.push(`${name} is not set (an unset GitHub secret/variable arrives as "").`);
			continue;
		}
		if (value !== value.trim()) {
			errors.push(`${name} has leading or trailing whitespace.`);
			continue;
		}
		values[name] = value;
	}

	const secret = values.BETTER_AUTH_SECRET;
	if (secret !== undefined) {
		if (secret === BETTER_AUTH_DEFAULT_SECRET) {
			errors.push("BETTER_AUTH_SECRET is Better Auth's public default secret.");
		} else if (secret.length < MIN_AUTH_SECRET_LENGTH) {
			errors.push(
				`BETTER_AUTH_SECRET must be at least ${MIN_AUTH_SECRET_LENGTH} characters (generate one with: openssl rand -base64 32).`,
			);
		}
	}

	for (const name of [
		"BETTER_AUTH_URL",
		"CORS_ORIGIN",
		"NEXT_PUBLIC_SERVER_URL",
		"NEXT_PUBLIC_SITE_URL",
	] as const) {
		const value = values[name];
		if (value === undefined) continue;
		const error = httpsUrlError(name, value);
		if (error) errors.push(error);
	}

	// CORS / trusted-origin matching is an exact string compare against the
	// browser's Origin header: no path, no trailing slash.
	// (try/new URL rather than URL.canParse: this file is also type-checked under
	// the Workers lib through packages/env/env.d.ts, which lacks canParse.)
	const cors = values.CORS_ORIGIN;
	const corsOrigin = cors === undefined ? undefined : parsedOrigin(cors);
	if (cors !== undefined && corsOrigin !== undefined && corsOrigin !== cors) {
		errors.push(
			`CORS_ORIGIN (${cors}) must be a bare origin like https://links.example.com (no path or trailing slash).`,
		);
	}

	// With a custom domain everything is same-origin (the API is routed under
	// the site's hostname), so these must all be that origin.
	const siteDomain = env.SITE_DOMAIN?.trim();
	if (siteDomain) {
		const expected = `https://${siteDomain}`;
		for (const name of ["BETTER_AUTH_URL", "CORS_ORIGIN", "NEXT_PUBLIC_SITE_URL"] as const) {
			const value = values[name];
			if (value !== undefined && value.replace(/\/$/, "") !== expected) {
				errors.push(`${name} (${value}) must be ${expected} when SITE_DOMAIN is set.`);
			}
		}
	}

	return errors;
}

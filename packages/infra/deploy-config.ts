// Pure deploy-time rules for alchemy.run.ts, kept free of Alchemy imports so
// they can be unit-tested (packages/infra/__tests__). alchemy.run.ts runs under
// Node's type stripping, so this file must stay erasable TypeScript only (no
// enums, no parameter properties, type-only imports marked `import type`).

import { validatePublicContactUrl } from "../validators/src/public-contact.ts";
import { publicationConfiguration } from "../validators/src/publication-config.ts";

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

function servingEnvErrors(env: Env): string[] {
	const mode = env.LINKDEN_SERVING_MODE || "legacy";
	if (!["legacy", "split"].includes(mode))
		return ["LINKDEN_SERVING_MODE must be exactly legacy or split."];
	if (mode === "legacy")
		return env.PUBLIC_CONTACT_URL ? ["PUBLIC_CONTACT_URL requires split serving mode."] : [];
	const errors: string[] = [];
	const origins: Record<string, URL> = {};
	for (const name of ["ADMIN_SITE_URL", "PUBLIC_SITE_URL"] as const) {
		try {
			const value = env[name] || "";
			const url = new URL(value);
			if (url.protocol !== "https:" || url.origin !== value || url.port) throw new Error();
			origins[name] = url;
		} catch {
			errors.push(`${name} must be a bare HTTPS origin without a port in split mode.`);
		}
	}
	if (origins.ADMIN_SITE_URL?.hostname.endsWith(".workers.dev"))
		errors.push(
			"ADMIN_SITE_URL must use an approved custom hostname; admin workers.dev access is disabled in split mode.",
		);
	if (
		origins.ADMIN_SITE_URL &&
		origins.PUBLIC_SITE_URL &&
		origins.ADMIN_SITE_URL.hostname === origins.PUBLIC_SITE_URL.hostname
	)
		errors.push("ADMIN_SITE_URL and PUBLIC_SITE_URL must use separate hostnames.");
	if (env.SITE_DOMAIN)
		errors.push(
			"SITE_DOMAIN must be unset in split mode; public domain ownership belongs to the separate publisher target.",
		);
	if (origins.ADMIN_SITE_URL) {
		for (const name of ["BETTER_AUTH_URL", "CORS_ORIGIN", "NEXT_PUBLIC_SERVER_URL"] as const) {
			if (env[name] && env[name] !== origins.ADMIN_SITE_URL.origin)
				errors.push(`${name} must equal ADMIN_SITE_URL in split mode.`);
		}
	}
	if (
		origins.PUBLIC_SITE_URL &&
		env.NEXT_PUBLIC_SITE_URL &&
		env.NEXT_PUBLIC_SITE_URL !== origins.PUBLIC_SITE_URL.origin
	)
		errors.push("NEXT_PUBLIC_SITE_URL must equal PUBLIC_SITE_URL in split mode.");
	const contact = validatePublicContactUrl(env.PUBLIC_CONTACT_URL, env.PUBLIC_SITE_URL);
	if (
		env.PUBLIC_CONTACT_URL &&
		(!contact || new URL(contact).origin === origins.ADMIN_SITE_URL?.origin)
	)
		errors.push(
			"PUBLIC_CONTACT_URL must be the exact HTTPS /api/contact URL on an approved custom hostname distinct from admin.",
		);
	return errors;
}

/** Explicit source preparation only: selecting split mode is an owner-approved routing cutover. */
export function resolveServingConfiguration(env: Env): {
	mode: "legacy" | "split";
	webDomain: string | undefined;
	publicOrigin: string | undefined;
	publicContactUrl: string | null;
} {
	const errors = servingEnvErrors(env);
	if (errors.length)
		throw new Error(`Serving configuration is invalid:\n  - ${errors.join("\n  - ")}`);
	const mode = env.LINKDEN_SERVING_MODE === "split" ? "split" : "legacy";
	return {
		mode,
		webDomain:
			mode === "split" ? new URL(env.ADMIN_SITE_URL!).hostname : env.SITE_DOMAIN || undefined,
		publicOrigin: mode === "split" ? env.PUBLIC_SITE_URL : env.NEXT_PUBLIC_SITE_URL,
		publicContactUrl:
			mode === "split"
				? validatePublicContactUrl(env.PUBLIC_CONTACT_URL, env.PUBLIC_SITE_URL)
				: null,
	};
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
	const errors = servingEnvErrors(env);
	for (const name of ["PUBLICATION_ENABLED", "PUBLICATION_SCHEDULER_ENABLED"] as const) {
		if (env[name] && !["true", "false"].includes(env[name]!))
			errors.push(`${name} must be exactly true or false.`);
	}
	const publication = publicationConfiguration(env);
	if (env.PUBLICATION_ENABLED === "true" && !publication.enabled)
		errors.push(`Publication is not configured: ${publication.unavailableReason}.`);
	if (env.PUBLICATION_SCHEDULER_ENABLED === "true" && !publication.enabled)
		errors.push("Scheduled publication requires an enabled, approved publication target.");
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

	// Already reported as malformed: left out of the same-origin check below.
	const invalidUrls = new Set<string>();
	for (const name of [
		"BETTER_AUTH_URL",
		"CORS_ORIGIN",
		"NEXT_PUBLIC_SERVER_URL",
		"NEXT_PUBLIC_SITE_URL",
	] as const) {
		const value = values[name];
		if (value === undefined) continue;
		const error = httpsUrlError(name, value);
		if (error) {
			errors.push(error);
			invalidUrls.add(name);
		}
	}

	// CORS / trusted-origin matching is an exact string compare against the
	// browser's Origin header, and the web client builds `${SERVER_URL}/trpc`
	// (a trailing slash makes `//trpc`, which neither the zone Routes nor the web
	// API bridge match): no path, no trailing slash on any of the three. The
	// message never echoes the value, which may carry URL credentials.
	// (try/new URL rather than URL.canParse: this file is also type-checked under
	// the Workers lib through packages/env/env.d.ts, which lacks canParse.)
	for (const name of ["BETTER_AUTH_URL", "CORS_ORIGIN", "NEXT_PUBLIC_SERVER_URL"] as const) {
		const value = values[name];
		if (value === undefined || invalidUrls.has(name)) continue;
		if (parsedOrigin(value) !== value) {
			invalidUrls.add(name);
			errors.push(`${name} must be a bare origin (no credentials, path, query or trailing slash).`);
		}
	}
	// The site URL is the origin the other three must equal, so it is checked the
	// same way (one trailing slash allowed): a path or query is reported here once
	// rather than as an unfixable mismatch on the other URLs.
	const siteUrl = values.NEXT_PUBLIC_SITE_URL;
	if (siteUrl !== undefined && !invalidUrls.has("NEXT_PUBLIC_SITE_URL")) {
		const canonical = siteUrl.replace(/\/$/, "");
		if (parsedOrigin(canonical) !== canonical) {
			invalidUrls.add("NEXT_PUBLIC_SITE_URL");
			errors.push(
				"NEXT_PUBLIC_SITE_URL must be a bare origin (no credentials, path or query; one trailing slash is allowed).",
			);
		}
	}

	// The web API bridge keeps browser auth same-origin, including workers.dev.
	const siteDomain = env.SITE_DOMAIN?.trim();
	if (env.LINKDEN_SERVING_MODE !== "split") {
		// A malformed site URL is already reported; don't blame the others for it.
		const site = invalidUrls.has("NEXT_PUBLIC_SITE_URL")
			? undefined
			: values.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "");
		const expected = siteDomain ? `https://${siteDomain}` : site;
		for (const name of [
			"BETTER_AUTH_URL",
			"CORS_ORIGIN",
			"NEXT_PUBLIC_SERVER_URL",
			"NEXT_PUBLIC_SITE_URL",
		] as const) {
			const value = values[name];
			if (invalidUrls.has(name)) continue;
			const canonical = name === "NEXT_PUBLIC_SITE_URL" ? value?.replace(/\/$/, "") : value;
			if (
				expected &&
				canonical?.startsWith("https://") &&
				parsedOrigin(canonical) === canonical &&
				canonical !== expected
			) {
				errors.push(
					siteDomain
						? `${name} (${value}) must be ${expected} when SITE_DOMAIN is set.`
						: `${name} must match NEXT_PUBLIC_SITE_URL in legacy mode; browser API calls use the web service binding.`,
				);
			}
		}
	}

	return errors;
}

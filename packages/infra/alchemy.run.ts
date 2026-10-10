import alchemy from "alchemy";
import { D1Database, Nextjs, R2Bucket, RateLimit, Worker } from "alchemy/cloudflare";
import { CloudflareStateStore } from "alchemy/state";
import { config } from "dotenv";
import { deployEnvErrors, resolveResourceNames } from "./deploy-config.ts";

// Run under Node rather than Bun — Bun segfaults executing this Alchemy program
// (exit 132/SIGILL), the same lesson as wolfathon and dirework. The
// deploy/destroy scripts in package.json run it under Node; `--destroy` selects
// the teardown phase, otherwise Alchemy auto-detects (deploy / dev).

// Load the infra .env first: ALCHEMY_STAGE may be set there, and the stage must
// be known before anything picks prod-vs-staging state or resource names.
config({ path: "./.env" });
const stage = process.env.ALCHEMY_STAGE?.trim() || "prod";
const isProd = stage === "prod";
const isDestroy = process.argv.includes("--destroy");
// Alchemy's own local-mode test (alchemy.ts: `--local` || `--dev`).
const isDev = process.argv.includes("--dev") || process.argv.includes("--local");
const isDeploy = !isDestroy && !isDev;

// The app-level .env files hold dev values (localhost URLs, a dev auth secret).
// They feed `bun dev` only: a deploy must take every value from the root .env
// or the CI environment, never silently fall back to a dev secret.
if (isDev) {
	config({ path: "../../apps/web/.env" });
	config({ path: "../../apps/server/.env" });
}

// `bun run destroy` defaults to the prod stage. Make tearing production down a
// deliberate act. The D1 database and R2 buckets below are declared with
// `delete: !isProd`, so once a deploy has recorded that in state a confirmed
// prod destroy removes the Workers and Alchemy state but keeps the data; state
// written by an older deploy still says delete, which is why this guard exists.
if (isDestroy && isProd && process.env.LINKDEN_CONFIRM_DESTROY_PROD !== "yes") {
	throw new Error(
		"Refusing to destroy the prod stage. For a staging copy set ALCHEMY_STAGE=<stage>. To really tear down production, re-run with LINKDEN_CONFIRM_DESTROY_PROD=yes (take a D1 export first).",
	);
}

// Physical resource names are pinned (with adopt: true) so re-deploys find the
// same D1/R2/Workers. Any stage other than prod gets a suffix, so a throwaway
// `ALCHEMY_STAGE=dev` deploy really is independent instead of adopting — and
// on destroy, deleting — the production database and buckets.
const suffix = isProd ? "" : `-${stage}`;
const names = resolveResourceNames(stage, process.env);
if (names.ignoredOverrides.length > 0) {
	console.warn(
		`Ignoring ${names.ignoredOverrides.join(" / ")} on stage "${stage}": these upgrade overrides apply to the prod stage only, so this stage uses ${names.db} / ${names.images}.`,
	);
}

// Routing model: the web worker owns the custom domain; the API worker gets
// zone Routes for `/api/*` and `/trpc/*` on that same hostname (Routes are
// matched before the custom-domain worker). Same origin for both, so no CORS
// and no cookie domain. When SITE_DOMAIN is unset (staging / first deploy)
// both workers stay on their workers.dev URLs.
const siteDomain = process.env.SITE_DOMAIN;

// The public origin is baked into robots/sitemap/OG URLs at build time. An
// unset GitHub variable arrives as "" (not undefined), which `alchemy.env`
// would pass through silently, so check it here and fail the deploy early —
// before Alchemy touches the state store or any resource.
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "";
if (isDeploy) {
	// Every value the Workers cannot run safely without, reported by name.
	const errors = deployEnvErrors(process.env);
	if (errors.length > 0) {
		throw new Error(`Deploy configuration is invalid:\n  - ${errors.join("\n  - ")}`);
	}
} else if (!isDestroy) {
	if (!siteUrl) {
		throw new Error(
			"NEXT_PUBLIC_SITE_URL is not set. Set it to the public origin of the site (https://SITE_DOMAIN, or the web worker's workers.dev URL for staging).",
		);
	}
	if (siteDomain && siteUrl.replace(/\/$/, "") !== `https://${siteDomain}`) {
		throw new Error(
			`NEXT_PUBLIC_SITE_URL (${siteUrl}) must be https://${siteDomain} when SITE_DOMAIN is set.`,
		);
	}
}

const app = await alchemy("linkden", {
	// Explicit stage so state never keys off $USER (which is "runner" in CI and
	// your login name locally — two different stages for the same resources).
	stage,
	phase: isDestroy ? "destroy" : undefined,
	// Shared account-wide state store: the `alchemy-state` worker, a SQLite
	// Durable Object shared by every MrDemonWolf Alchemy app (website, wolfathon,
	// dirework, linkden). Alchemy namespaces state by app, so linkden's state
	// lives under the "linkden" scope inside it. Every app MUST pass the same
	// ALCHEMY_STATE_TOKEN or the store rejects it.
	stateStore: (scope) =>
		new CloudflareStateStore(scope, {
			scriptName: "alchemy-state",
			stateToken: alchemy.secret(process.env.ALCHEMY_STATE_TOKEN),
		}),
});

// Upgrading from a deploy made before the names were pinned? Those CI deploys
// created `linkden-database-runner` / `linkden-images-runner` (Alchemy's
// generated names). LINKDEN_DB_NAME / LINKDEN_IMAGES_BUCKET point the prod stage
// at them (see resolveResourceNames and docs/self-hosting/cloudflare).
//
// `delete: !isProd`: a destroy of the prod stage drops these from Alchemy state
// but never deletes the production database or buckets (a deleted D1 cannot be
// recovered with Time Travel). Deleting production data takes a code change.
const db = await D1Database("database", {
	name: names.db,
	adopt: true,
	delete: !isProd,
	migrationsDir: "../../packages/db/src/migrations",
});

const imagesBucket = await R2Bucket("images", {
	name: names.images,
	adopt: true,
	delete: !isProd,
});

// Nightly D1 dumps land here (see .github/workflows/backup-db.yml); R2 expires
// them after 30 days so the bucket never grows unbounded.
await R2Bucket("backups", {
	name: names.backups,
	adopt: true,
	delete: !isProd,
	lifecycle: [
		{
			id: "expire-after-30-days",
			conditions: { prefix: "" },
			deleteObjectsTransition: { condition: { type: "Age", maxAge: 30 * 24 * 60 * 60 } },
		},
	],
});

// Rate-limit namespaces are account-wide counters; non-prod stages share a
// second block so they never eat into production's buckets.
const rlBase = isProd ? 1000 : 2000;
const rlAuth = RateLimit({ namespace_id: rlBase + 1, simple: { limit: 10, period: 60 } });
const rlStrict = RateLimit({ namespace_id: rlBase + 2, simple: { limit: 5, period: 60 } });
const rlUpload = RateLimit({ namespace_id: rlBase + 3, simple: { limit: 20, period: 60 } });
const rlPublic = RateLimit({ namespace_id: rlBase + 4, simple: { limit: 60, period: 60 } });
const rlOg = RateLimit({ namespace_id: rlBase + 5, simple: { limit: 10, period: 60 } });
// Global (constant-key) cap on sign-in / 2FA / password-reset attempts; mirrors
// RL_SIGNIN in apps/server/wrangler.jsonc.
const rlSignin = RateLimit({ namespace_id: rlBase + 6, simple: { limit: 30, period: 60 } });

// Wallet signing material is optional and only the API worker signs passes, so
// it is bound to the server alone. Bind each key only when it is set so
// an unset value never becomes an empty-string binding.
const walletBindings = {
	...(process.env.WALLET_SIGNER_CERT && {
		WALLET_SIGNER_CERT: alchemy.secret.env.WALLET_SIGNER_CERT!,
	}),
	...(process.env.WALLET_SIGNER_KEY && {
		WALLET_SIGNER_KEY: alchemy.secret.env.WALLET_SIGNER_KEY!,
	}),
	...(process.env.WALLET_WWDR_CERT && {
		WALLET_WWDR_CERT: alchemy.secret.env.WALLET_WWDR_CERT!,
	}),
	...(process.env.WALLET_TEAM_ID && {
		WALLET_TEAM_ID: alchemy.env.WALLET_TEAM_ID!,
	}),
	...(process.env.WALLET_PASS_TYPE_ID && {
		WALLET_PASS_TYPE_ID: alchemy.env.WALLET_PASS_TYPE_ID!,
	}),
	...(process.env.WALLET_SIGNER_KEY_PASSPHRASE && {
		WALLET_SIGNER_KEY_PASSPHRASE: alchemy.secret.env.WALLET_SIGNER_KEY_PASSPHRASE!,
	}),
};

// Workers runtime semantics are date-gated. Pin the date instead of inheriting
// Alchemy's default (miniflare's bundled workerd date), which would silently
// move production to a newer runtime on any lockfile bump. Bump it
// deliberately, together with apps/server/wrangler.jsonc (local `bun dev:server`).
const COMPATIBILITY_DATE = "2026-04-24";

// Server is declared first: the web worker binds it as a service binding
// (a worker's fetch() to its own zone bypasses Routes, so SSR must call the
// API through the binding rather than over HTTP).
export const server = await Worker("server", {
	adopt: true,
	name: `linkden-api${suffix}`,
	cwd: "../../apps/server",
	entrypoint: "src/index.ts",
	compatibility: "node",
	compatibilityDate: COMPATIBILITY_DATE,
	// Daily retention sweep (prune analytics/sessions/contacts/audit + orphan R2).
	crons: ["0 3 * * *"],
	// Invocation logs record each request's full URL, query string included,
	// which would put magic-link / email-verification tokens in Workers Logs.
	// The app's own request line (apps/server/src/index.ts) logs the path only.
	observability: { logs: { invocationLogs: false } },
	...(siteDomain && {
		routes: [
			{ pattern: `${siteDomain}/api/*`, adopt: true },
			{ pattern: `${siteDomain}/trpc/*`, adopt: true },
		],
	}),
	bindings: {
		DB: db,
		IMAGES_BUCKET: imagesBucket,
		RL_AUTH: rlAuth,
		RL_STRICT: rlStrict,
		RL_UPLOAD: rlUpload,
		RL_PUBLIC: rlPublic,
		RL_SIGNIN: rlSignin,
		CORS_ORIGIN: alchemy.env.CORS_ORIGIN!,
		BETTER_AUTH_SECRET: alchemy.secret.env.BETTER_AUTH_SECRET!,
		BETTER_AUTH_URL: alchemy.env.BETTER_AUTH_URL!,
		...walletBindings,
		// Optional first-run guard (apps/server/src/lib/setup-token.ts): while
		// no admin exists, sign-up must present it. Bound only when set.
		...(process.env.SETUP_TOKEN?.trim() && {
			SETUP_TOKEN: alchemy.secret.env.SETUP_TOKEN!,
		}),
	},
	dev: {
		port: 3000,
	},
});
// DEV_LOGIN is never bound here — Alchemy is the production deploy path.
// Local wrangler dev gets it from apps/server/.dev.vars instead, so the auth
// bypass can never ship regardless of what's in a developer's root .env.

export const web = await Nextjs("linkden", {
	adopt: true,
	name: `linkden${suffix}`,
	cwd: "../../apps/web",
	compatibilityDate: COMPATIBILITY_DATE,
	...(siteDomain && { domains: [{ domainName: siteDomain, adopt: true }] }),
	bindings: {
		API: server,
		NEXT_PUBLIC_SERVER_URL: alchemy.env.NEXT_PUBLIC_SERVER_URL!,
		NEXT_PUBLIC_SITE_URL: siteUrl,
		RL_OG: rlOg,
	},
	dev: {
		env: {
			PORT: "3001",
		},
	},
});

console.log(`Web    -> ${web.url}`);
console.log(`Server -> ${server.url}`);
if (siteDomain) {
	console.log(`Site   -> https://${siteDomain} (API routes: /api/*, /trpc/*)`);
}

await app.finalize();

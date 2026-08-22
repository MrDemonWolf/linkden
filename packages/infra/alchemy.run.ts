import alchemy from "alchemy";
import { D1Database, Nextjs, R2Bucket, RateLimit, Worker } from "alchemy/cloudflare";
import { CloudflareStateStore } from "alchemy/state";
import { config } from "dotenv";

config({ path: "./.env" });
config({ path: "../../apps/web/.env" });
config({ path: "../../apps/server/.env" });

// Run under Node (via tsx) rather than Bun — Bun segfaults executing this
// Alchemy program (exit 132/SIGILL), the same lesson as wolfathon and dirework.
// The deploy/destroy scripts in package.json use tsx; `--destroy` selects the
// teardown phase, otherwise Alchemy auto-detects (deploy / dev).
const stage = process.env.ALCHEMY_STAGE ?? "prod";
const isDestroy = process.argv.includes("--destroy");
// Physical resource names are pinned (with adopt: true) so re-deploys find the
// same D1/R2/Workers. Any stage other than prod gets a suffix, so a throwaway
// `ALCHEMY_STAGE=dev` deploy really is independent instead of adopting — and
// on destroy, deleting — the production database and buckets.
const suffix = stage === "prod" ? "" : `-${stage}`;

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

// Routing model: the web worker owns the custom domain; the API worker gets
// zone Routes for `/api/*` and `/trpc/*` on that same hostname (Routes are
// matched before the custom-domain worker). Same origin for both, so no CORS
// and no cookie domain. When SITE_DOMAIN is unset (staging / first deploy)
// both workers stay on their workers.dev URLs.
const siteDomain = process.env.SITE_DOMAIN;

// The public origin is baked into robots/sitemap/OG URLs at build time. An
// unset GitHub variable arrives as "" (not undefined), which `alchemy.env`
// would pass through silently, so check it here and fail the deploy early.
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "";
if (!isDestroy) {
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

// Upgrading from a deploy made before the names were pinned? Those CI deploys
// created `linkden-database-runner` / `linkden-images-runner` (Alchemy's
// generated names). Point these at your existing resources so the prod stage
// adopts them instead of creating empty ones; see docs/self-hosting/cloudflare.
const db = await D1Database("database", {
	name: process.env.LINKDEN_DB_NAME || `linkden-db${suffix}`,
	adopt: true,
	migrationsDir: "../../packages/db/src/migrations",
});

const imagesBucket = await R2Bucket("images", {
	name: process.env.LINKDEN_IMAGES_BUCKET || `linkden-images${suffix}`,
	adopt: true,
});

// Nightly D1 dumps land here (see .github/workflows/backup-db.yml); R2 expires
// them after 30 days so the bucket never grows unbounded.
await R2Bucket("backups", {
	name: `linkden-backups${suffix}`,
	adopt: true,
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
const rlBase = stage === "prod" ? 1000 : 2000;
const rlAuth = RateLimit({ namespace_id: rlBase + 1, simple: { limit: 10, period: 60 } });
const rlStrict = RateLimit({ namespace_id: rlBase + 2, simple: { limit: 5, period: 60 } });
const rlUpload = RateLimit({ namespace_id: rlBase + 3, simple: { limit: 20, period: 60 } });
const rlPublic = RateLimit({ namespace_id: rlBase + 4, simple: { limit: 60, period: 60 } });

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

// Server is declared first: the web worker binds it as a service binding
// (a worker's fetch() to its own zone bypasses Routes, so SSR must call the
// API through the binding rather than over HTTP).
export const server = await Worker("server", {
	adopt: true,
	name: `linkden-api${suffix}`,
	cwd: "../../apps/server",
	entrypoint: "src/index.ts",
	compatibility: "node",
	// Daily retention sweep (prune analytics/sessions/contacts/audit + orphan R2).
	crons: ["0 3 * * *"],
	observability: { logs: { invocationLogs: true } },
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
		CORS_ORIGIN: alchemy.env.CORS_ORIGIN!,
		BETTER_AUTH_SECRET: alchemy.secret.env.BETTER_AUTH_SECRET!,
		BETTER_AUTH_URL: alchemy.env.BETTER_AUTH_URL!,
		...walletBindings,
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
	...(siteDomain && { domains: [{ domainName: siteDomain, adopt: true }] }),
	bindings: {
		API: server,
		NEXT_PUBLIC_SERVER_URL: alchemy.env.NEXT_PUBLIC_SERVER_URL!,
		NEXT_PUBLIC_SITE_URL: siteUrl,
		DB: db,
		IMAGES_BUCKET: imagesBucket,
		CORS_ORIGIN: alchemy.env.CORS_ORIGIN!,
		BETTER_AUTH_SECRET: alchemy.secret.env.BETTER_AUTH_SECRET!,
		BETTER_AUTH_URL: alchemy.env.BETTER_AUTH_URL!,
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

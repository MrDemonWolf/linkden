import alchemy from "alchemy";
import { D1Database, Nextjs, R2Bucket, RateLimit, Worker } from "alchemy/cloudflare";
import { D1StateStore } from "alchemy/state";
import { config } from "dotenv";

config({ path: "./.env" });
config({ path: "../../apps/web/.env" });
config({ path: "../../apps/server/.env" });

const app = await alchemy("linkden", {
	// Shared account-wide state store: the `alchemy-state` D1 (default name).
	// Alchemy namespaces state by app, so linkden's state lives under the
	// "linkden" scope alongside the other MrDemonWolf Alchemy apps.
	stateStore: (scope) => new D1StateStore(scope),
});

const db = await D1Database("database", {
	adopt: true,
	migrationsDir: "../../packages/db/src/migrations",
});

const imagesBucket = await R2Bucket("images", { adopt: true });

const rlAuth = RateLimit({ namespace_id: 1001, simple: { limit: 10, period: 60 } });
const rlStrict = RateLimit({ namespace_id: 1002, simple: { limit: 5, period: 60 } });
const rlUpload = RateLimit({ namespace_id: 1003, simple: { limit: 20, period: 60 } });
const rlPublic = RateLimit({ namespace_id: 1004, simple: { limit: 60, period: 60 } });

export const web = await Nextjs("linkden", {
	adopt: true,
	cwd: "../../apps/web",
	bindings: {
		NEXT_PUBLIC_SERVER_URL: alchemy.env.NEXT_PUBLIC_SERVER_URL!,
		DB: db,
		IMAGES_BUCKET: imagesBucket,
		CORS_ORIGIN: alchemy.env.CORS_ORIGIN!,
		BETTER_AUTH_SECRET: alchemy.secret.env.BETTER_AUTH_SECRET!,
		BETTER_AUTH_URL: alchemy.env.BETTER_AUTH_URL!,
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
	},
	dev: {
		env: {
			PORT: "3001",
		},
	},
});

export const server = await Worker("server", {
	adopt: true,
	name: "linkden-api",
	cwd: "../../apps/server",
	entrypoint: "src/index.ts",
	compatibility: "node",
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
	},
	dev: {
		port: 3000,
	},
});
// DEV_LOGIN is never bound here — Alchemy is the production deploy path.
// Local wrangler dev gets it from apps/server/.dev.vars instead, so the auth
// bypass can never ship regardless of what's in a developer's root .env.

console.log(`Web    -> ${web.url}`);
console.log(`Server -> ${server.url}`);

await app.finalize();

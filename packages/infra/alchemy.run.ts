import alchemy from "alchemy";
import { Nextjs } from "alchemy/cloudflare";
import { Worker } from "alchemy/cloudflare";
import { D1Database } from "alchemy/cloudflare";
import { R2Bucket } from "alchemy/cloudflare";
import { RateLimit } from "alchemy/cloudflare";
import { config } from "dotenv";

config({ path: "./.env" });
config({ path: "../../apps/web/.env" });
config({ path: "../../apps/server/.env" });

const app = await alchemy("linkden");

const db = await D1Database("database", {
  migrationsDir: "../../packages/db/src/migrations",
});

const imagesBucket = await R2Bucket("images");

const rlAuth = RateLimit({ namespace_id: 1001, simple: { limit: 10, period: 60 } });
const rlStrict = RateLimit({ namespace_id: 1002, simple: { limit: 5, period: 60 } });
const rlUpload = RateLimit({ namespace_id: 1003, simple: { limit: 20, period: 60 } });

export const web = await Nextjs("linkden", {
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

console.log(`Web    -> ${web.url}`);
console.log(`Server -> ${server.url}`);

await app.finalize();

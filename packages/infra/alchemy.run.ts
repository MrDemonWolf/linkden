import { Alchemy } from "alchemy";
import { D1Database, Worker } from "alchemy/cloudflare";

const app = new Alchemy("linkden");

const destroy = process.argv.includes("--destroy");

const db = await D1Database("linkden-db", {
  adopt: true,
});

const api = await Worker("linkden-api", {
  name: "linkden-api",
  script: new URL("../../apps/server/dist/index.js", import.meta.url),
  bindings: {
    DB: db,
  },
  env: {
    CORS_ORIGIN: process.env.CORS_ORIGIN ?? "http://localhost:3000",
    APP_URL: process.env.APP_URL ?? "http://localhost:3000",
    CF_ACCESS_TEAM_DOMAIN: process.env.CF_ACCESS_TEAM_DOMAIN ?? "",
    CLERK_SECRET_KEY: process.env.CLERK_SECRET_KEY ?? "",
    RESEND_API_KEY: process.env.RESEND_API_KEY ?? "",
    APPLE_PASS_SIGNER_CERT: process.env.APPLE_PASS_SIGNER_CERT ?? "",
    APPLE_PASS_SIGNER_KEY: process.env.APPLE_PASS_SIGNER_KEY ?? "",
    APPLE_PASS_TYPE_ID: process.env.APPLE_PASS_TYPE_ID ?? "",
    APPLE_TEAM_ID: process.env.APPLE_TEAM_ID ?? "",
  },
  compatibilityFlags: ["nodejs_compat"],
});

// Web frontend is deployed as a Cloudflare Worker via @opennextjs/cloudflare.
// Run `pnpm cf:deploy` from the root to deploy both API + Web workers.
//
// API:  linkden-api.<account>.workers.dev  (or custom domain via CF dashboard)
// Web:  linkden-web.<account>.workers.dev  (or custom domain via CF dashboard)
//
// To add custom domains, go to your Cloudflare dashboard > Workers & Pages >
// select the worker > Settings > Domains & Routes.

await app.finalize({ destroy });

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

// Web frontend is deployed separately via Cloudflare Pages.
// Connect the GitHub repo to Cloudflare Pages with:
//   Project name: linkden
//   Build command: pnpm --filter @linkden/web build
//   Build output: apps/web/.next
//   Root directory: /
//   Framework preset: Next.js
//
// This gives you: linkden.pages.dev
// Add a custom domain later via the Cloudflare Pages dashboard.

await app.finalize({ destroy });

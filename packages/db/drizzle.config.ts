import dotenv from "dotenv";
import { defineConfig } from "drizzle-kit";

dotenv.config({
	path: "../../apps/server/.env",
});

// `bun db:generate` only diffs ./src/schema against the snapshots in
// ./src/migrations and needs no connection. Migrations are applied by Alchemy
// (`bun dev` locally, `bun ship` in production) from ./src/migrations, which
// keeps the d1_migrations ledger and the 0007 single-admin trigger in place.
//
// There is deliberately no `db:push` script: push bypasses the migration
// ledger (and the trigger migration), so it must never touch a real database.
// `bunx drizzle-kit push` / `studio` talk to a remote D1 over HTTP and need all
// three variables below; without them drizzle-kit exits with "Please provide
// required params for D1 HTTP driver". Only point them at a throwaway database.
const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
const databaseId = process.env.CLOUDFLARE_D1_DATABASE_ID;
const token = process.env.CLOUDFLARE_D1_TOKEN;

export default defineConfig({
	schema: "./src/schema",
	out: "./src/migrations",
	// DOCS: https://orm.drizzle.team/docs/guides/d1-http-with-drizzle-kit
	dialect: "sqlite",
	driver: "d1-http",
	...(accountId && databaseId && token ? { dbCredentials: { accountId, databaseId, token } } : {}),
});

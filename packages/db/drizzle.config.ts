import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./src/schema.ts",
  out: "./drizzle",
  dialect: "sqlite",
  driver: "d1-http",
  dbCredentials: {
    accountId: process.env.CLOUDFLARE_ACCOUNT_ID!,
    databaseId: process.env.CLOUDFLARE_D1_DATABASE_ID || "8f2efc27-b2f4-4139-b807-fdab7adeaee4",
    token: process.env.CLOUDFLARE_D1_TOKEN || process.env.CLOUDFLARE_API_TOKEN!,
  },
});

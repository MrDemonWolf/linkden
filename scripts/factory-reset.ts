import { execSync } from "node:child_process";

const args = process.argv.slice(2);
const confirm = args.includes("--confirm");
const remote = args.includes("--remote");

if (!confirm) {
  console.error("Usage: pnpm reset:factory -- --confirm [--remote]");
  console.error("This will DELETE ALL DATA. Pass --confirm to proceed.");
  process.exit(1);
}

// All tables in the database (order matters for foreign key constraints)
const tables = [
  "link_click",
  "page_view",
  "contact_submission",
  "session",
  "account",
  "verification",
  "block",
  "social_network",
  "site_settings",
  "user",
];

const remoteFlag = remote ? " --remote" : "";

console.log(`Factory resetting${remote ? " PRODUCTION" : " local"} database...`);

for (const table of tables) {
  const sql = `DELETE FROM ${table}`;
  const cmd = `npx wrangler d1 execute linkden-db --command "${sql}"${remoteFlag}`;

  try {
    console.log(`  Clearing ${table}...`);
    execSync(cmd, { stdio: "inherit", cwd: "apps/server" });
  } catch {
    console.error(`  Failed to clear ${table}, continuing...`);
  }
}

console.log("Factory reset complete.");

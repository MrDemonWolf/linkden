import { execSync } from "node:child_process";
import { hashSync } from "bcryptjs";

const args = process.argv.slice(2);

function getArg(name: string): string | undefined {
  const index = args.indexOf(`--${name}`);
  if (index === -1 || index + 1 >= args.length) return undefined;
  return args[index + 1];
}

const email = getArg("email");
const password = getArg("password");
const remote = args.includes("--remote");

if (!email || !password) {
  console.error("Usage: pnpm reset:password -- --email <email> --password <password> [--remote]");
  process.exit(1);
}

const hash = hashSync(password, 10);
// Escape single quotes in the hash for SQL
const escapedHash = hash.replace(/'/g, "''");

const sql = `UPDATE account SET password='${escapedHash}' WHERE userId=(SELECT id FROM user WHERE email='${email}')`;

const remoteFlag = remote ? " --remote" : "";
const cmd = `npx wrangler d1 execute linkden-db --command "${sql}"${remoteFlag}`;

console.log(`Resetting password for ${email}${remote ? " (production)" : " (local)"}...`);

try {
  execSync(cmd, { stdio: "inherit", cwd: "apps/server" });
  console.log("Password reset successfully.");
} catch {
  console.error("Failed to reset password.");
  process.exit(1);
}

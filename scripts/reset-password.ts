import { execFileSync } from "node:child_process";
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
  console.error("Usage: bun reset:password -- --email <email> --password <password> [--remote]");
  process.exit(1);
}

// Validate email format to prevent SQL injection via the email argument
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
if (!emailRegex.test(email)) {
  console.error("Error: Invalid email address format.");
  process.exit(1);
}
// Escape single quotes in both values for SQL safety
const escapedEmail = email.replace(/'/g, "''");

const hash = hashSync(password, 10);
// Escape single quotes in the hash for SQL
const escapedHash = hash.replace(/'/g, "''");

const sql = `UPDATE account SET password='${escapedHash}' WHERE userId=(SELECT id FROM user WHERE email='${escapedEmail}')`;

const wranglerArgs = ["wrangler", "d1", "execute", "linkden-db", "--command", sql];
if (remote) wranglerArgs.push("--remote");

console.log(`Resetting password for ${email}${remote ? " (production)" : " (local)"}...`);

try {
  execFileSync("npx", wranglerArgs, { stdio: "inherit", cwd: "apps/server" });
  console.log("Password reset successfully.");
} catch {
  console.error("Failed to reset password.");
  process.exit(1);
}

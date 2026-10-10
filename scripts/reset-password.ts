import {
	findLocalD1Files,
	getArg,
	loadBetterAuthCrypto,
	openSqlite,
	parseWranglerJson,
	readSecretLine,
	resolveDbName,
	wranglerRemote,
} from "./lib/d1";
import { normalizeEmail, passwordProblem, passwordResetSql } from "./lib/reset-sql";

const USAGE = `Usage: bun reset:password -- --email <email> [--disable-2fa] [--remote] [--db <name>]

The new password is read from a hidden prompt, from the first line of stdin
(e.g. \`... < pw.txt\`), or from LINKDEN_RESET_PASSWORD — never from argv.

  (default)  the local dev databases (bun dev and bun dev:server). Stop the dev
             server first.
  --remote   the production D1 through wrangler: --db, else LINKDEN_DB_NAME,
             else linkden-db. Needs CLOUDFLARE_API_TOKEN or \`wrangler login\`.

  --disable-2fa  also turn two-factor off (lost authenticator and backup codes);
                 turn it back on under Settings › Account afterwards.

Every session of the account is signed out.`;

function fail(message: string): never {
	console.error(`Error: ${message}`);
	process.exit(1);
}

async function readPassword(args: string[]): Promise<string> {
	// biome-ignore lint/suspicious/noUndeclaredEnvVars: read by a bun script, not a turbo task
	const fromEnv = process.env.LINKDEN_RESET_PASSWORD;
	if (fromEnv) return fromEnv;
	const fromArg = getArg(args, "password");
	if (fromArg !== undefined) {
		console.warn(
			"Warning: --password leaves the password in your shell history and the process list. Prefer the prompt, stdin or LINKDEN_RESET_PASSWORD.",
		);
		return fromArg;
	}
	const password = await readSecretLine("New password: ");
	if (process.stdin.isTTY && (await readSecretLine("Repeat password: ")) !== password) {
		fail("Passwords do not match. Nothing was changed.");
	}
	return password;
}

async function main() {
	const args = process.argv.slice(2);
	const remote = args.includes("--remote");
	const disableTwoFactor = args.includes("--disable-2fa");
	const rawEmail = getArg(args, "email");
	if (!rawEmail) {
		console.error(USAGE);
		process.exit(1);
	}
	const email = normalizeEmail(rawEmail);
	if (!email) fail("Invalid email address format.");

	const password = await readPassword(args);
	const problem = passwordProblem(password);
	if (problem) fail(problem);

	// Better Auth's own scrypt `salt:key` hash — the only format the server's
	// sign-in can verify.
	const { hashPassword } = await loadBetterAuthCrypto();
	const sql = passwordResetSql(email, await hashPassword(password), Date.now(), {
		disableTwoFactor,
	});
	const done = `Password reset. Every session of this account was signed out.${
		disableTwoFactor ? " Two-factor authentication is now off." : ""
	}`;

	if (remote) {
		const dbName = resolveDbName(args);
		console.log(`Resetting password for ${email} in the production D1 "${dbName}"...`);
		const out = wranglerRemote(
			dbName,
			["--json", "--command", [...sql.mutations, sql.verify].join(";\n")],
			true,
		);
		const verifyRows = parseWranglerJson(out).at(-1);
		if (Number(verifyRows?.[0]?.updated ?? 0) < 1) {
			fail(`No credential account for ${email} in "${dbName}". Nothing was changed.`);
		}
		console.log(done);
		return;
	}

	const files = findLocalD1Files();
	if (files.length === 0) {
		fail(
			"No local D1 database found. Run `bun dev` (or `bun dev:server`) once so it is created, or pass --remote for production.",
		);
	}
	console.log(`Resetting password for ${email} in the local dev databases...`);
	let updatedAny = false;
	for (const { label, file } of files) {
		const db = await openSqlite(file);
		try {
			const hasSchema = db
				.query("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'account'")
				.get();
			if (!hasSchema) continue;
			const updated = db.transaction(() => {
				for (const statement of sql.mutations) db.run(statement);
				return Number(db.query(sql.verify).get()?.updated ?? 0);
			})();
			console.log(`  ${label}: ${updated > 0 ? "updated" : `no credential account for ${email}`}`);
			updatedAny ||= updated > 0;
		} finally {
			db.close();
		}
	}
	if (!updatedAny) fail(`No credential account for ${email} in any local database.`);
	console.log(done);
}

main().catch((error: unknown) => {
	fail(error instanceof Error ? error.message : String(error));
});

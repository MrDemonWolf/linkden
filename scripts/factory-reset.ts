import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import {
	findLocalD1Files,
	getArg,
	openSqlite,
	parseWranglerJson,
	readLine,
	resolveDbName,
	wranglerRemote,
} from "./lib/d1";
import { factoryResetStatements, LIST_TABLES_SQL } from "./lib/reset-sql";

const USAGE = `Usage: bun reset:factory -- --confirm [--remote] [--db <name>] [--confirm-db <name>]

Deletes ALL data: the admin account, links, settings, social links, analytics,
messages and the audit log. The schema and migration history are kept.

  (default)  the local dev databases (bun dev and bun dev:server). Stop the dev
             server first.
  --remote   the production D1 through wrangler: --db, else LINKDEN_DB_NAME,
             else linkden-db. You are asked to type the database name (or pass
             --confirm-db <name> when not on a terminal). Take an export first:
             wrangler d1 export <db> --remote --output=before-reset.sql`;

function fail(message: string): never {
	console.error(`Error: ${message}`);
	process.exit(1);
}

async function resetRemote(args: string[]) {
	const dbName = resolveDbName(args);
	const typed = process.stdin.isTTY
		? await readLine(
				`This permanently deletes every row in the PRODUCTION D1 "${dbName}".\nType the database name to continue: `,
			)
		: getArg(args, "confirm-db");
	if (typed?.trim() !== dbName) fail("Confirmation did not match. Nothing was changed.");

	const tables = (
		parseWranglerJson(wranglerRemote(dbName, ["--json", "--command", LIST_TABLES_SQL], true))[0] ??
		[]
	).map((row) => String(row.name));
	const statements = factoryResetStatements(tables);
	if (statements.length < 2) fail(`"${dbName}" has no data tables. Nothing was changed.`);

	// One `--file` run: wrangler imports the file as a single unit and the
	// database returns to its original state if any statement fails — never a
	// half-wiped database reported as reset.
	const dir = mkdtempSync(path.join(tmpdir(), "linkden-factory-reset-"));
	const file = path.join(dir, "reset.sql");
	try {
		writeFileSync(file, `${statements.join(";\n")};\n`);
		console.log(`Factory resetting the production D1 "${dbName}"...`);
		wranglerRemote(dbName, ["--yes", "--file", file]);
	} finally {
		rmSync(dir, { recursive: true, force: true });
	}
	console.log(`Factory reset complete: emptied ${statements.length - 1} tables in "${dbName}".`);
}

async function resetLocal() {
	const files = findLocalD1Files();
	if (files.length === 0) {
		fail("No local D1 database found. Nothing to reset (pass --remote for production).");
	}
	console.log("Factory resetting the local dev databases...");
	let resetAny = false;
	for (const { label, file } of files) {
		const db = await openSqlite(file);
		try {
			const tables = db
				.query(LIST_TABLES_SQL)
				.all()
				.map((row) => String(row.name));
			if (!tables.includes("user")) continue;
			const statements = factoryResetStatements(tables);
			// All-or-nothing per database.
			db.transaction(() => {
				for (const statement of statements) db.run(statement);
			})();
			console.log(`  ${label}: emptied ${statements.length - 1} tables`);
			resetAny = true;
		} finally {
			db.close();
		}
	}
	if (!resetAny) fail("No local database with the LinkDen schema was found.");
	console.log("Factory reset complete. Open /admin/setup to create the admin account again.");
}

async function main() {
	const args = process.argv.slice(2);
	if (!args.includes("--confirm")) {
		console.error(USAGE);
		process.exit(1);
	}
	if (args.includes("--remote")) await resetRemote(args);
	else await resetLocal();
}

main().catch((error: unknown) => {
	fail(error instanceof Error ? error.message : String(error));
});

// Runtime plumbing shared by the reset scripts: argument parsing, reaching the
// production D1 through wrangler, the local D1 files, Better Auth's password
// hashing and terminal prompts. The SQL itself lives in ./reset-sql.ts.
import { execFileSync } from "node:child_process";
import { existsSync, readdirSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

export const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

export function getArg(args: string[], name: string): string | undefined {
	const flag = `--${name}`;
	const inline = args.find((a) => a.startsWith(`${flag}=`));
	if (inline) return inline.slice(flag.length + 1);
	const index = args.indexOf(flag);
	if (index === -1 || index + 1 >= args.length) return undefined;
	return args[index + 1];
}

/**
 * The production D1 name: `--db`, else LINKDEN_DB_NAME (pre-0.5.0 installs keep
 * their generated name, the same variable alchemy.run.ts and backup-db.yml
 * honour), else `linkden-db`.
 */
export function resolveDbName(args: string[]): string {
	return getArg(args, "db")?.trim() || process.env.LINKDEN_DB_NAME?.trim() || "linkden-db";
}

// ── Remote (production) ────────────────────────────────────────────────────

const WRANGLER_BIN = path.join(REPO_ROOT, "apps/server/node_modules/.bin/wrangler");

/**
 * Run `wrangler d1 execute <db> --remote …` from the repo root. Not from
 * apps/server: its wrangler.jsonc pins database_id "local" for `wrangler dev`,
 * so wrangler would ask the API for a database with id "local" and fail. With
 * no config in cwd wrangler resolves the database by name (as backup-db.yml
 * does). Needs CLOUDFLARE_API_TOKEN (+ CLOUDFLARE_ACCOUNT_ID) or `wrangler login`.
 * Throws on a non-zero exit.
 */
export function wranglerRemote(dbName: string, args: string[], capture = false): string {
	if (!existsSync(WRANGLER_BIN)) {
		throw new Error(`wrangler not found at ${WRANGLER_BIN}. Run \`bun install\` first.`);
	}
	try {
		const out = execFileSync(WRANGLER_BIN, ["d1", "execute", dbName, "--remote", ...args], {
			cwd: REPO_ROOT,
			encoding: "utf8",
			stdio: ["inherit", capture ? "pipe" : "inherit", "inherit"],
		});
		return out ?? "";
	} catch (error) {
		// With --json wrangler reports the failure on stdout, which we captured.
		const stdout = (error as { stdout?: string }).stdout?.trim();
		throw new Error(`wrangler d1 execute failed${stdout ? `:\n${stdout}` : "."}`);
	}
}

type D1Result = { results?: Record<string, unknown>[] };

/** Rows of every statement from `wrangler d1 execute --json` output, in order. */
export function parseWranglerJson(output: string): Record<string, unknown>[][] {
	const parsed: unknown = JSON.parse(output);
	const results = (Array.isArray(parsed) ? parsed : [parsed]) as D1Result[];
	return results.map((r) => r.results ?? []);
}

// ── Local (dev) ────────────────────────────────────────────────────────────

/**
 * Where local D1 data lives. `bun dev` runs the Alchemy program in dev mode,
 * which persists to .alchemy/miniflare; `bun dev:server` runs `wrangler dev`,
 * which persists to apps/server/.wrangler/state. They are different databases.
 */
export const LOCAL_D1_STORES = [
	{ label: "bun dev (Alchemy)", dir: ".alchemy/miniflare/v3/d1/miniflare-D1DatabaseObject" },
	{
		label: "bun dev:server (wrangler)",
		dir: "apps/server/.wrangler/state/v3/d1/miniflare-D1DatabaseObject",
	},
];

export interface LocalD1File {
	label: string;
	file: string;
}

/** Every local D1 SQLite file (miniflare's own metadata.sqlite index excluded). */
export function findLocalD1Files(): LocalD1File[] {
	const found: LocalD1File[] = [];
	for (const store of LOCAL_D1_STORES) {
		const dir = path.join(REPO_ROOT, store.dir);
		if (!existsSync(dir)) continue;
		for (const name of readdirSync(dir)) {
			if (name.endsWith(".sqlite") && name !== "metadata.sqlite") {
				found.push({ label: store.label, file: path.join(dir, name) });
			}
		}
	}
	return found;
}

export interface SqliteDb {
	query(sql: string): { all(): Record<string, unknown>[]; get(): Record<string, unknown> | null };
	run(sql: string): unknown;
	transaction<T>(fn: () => T): () => T;
	close(): void;
}

/** bun:sqlite — the reset scripts run under Bun (`bun reset:*`). */
export async function openSqlite(file: string): Promise<SqliteDb> {
	// Indirect specifier: keeps `bun:sqlite` out of static analysis for tools
	// that run under Node (tsc, Vitest), which never load this function.
	const specifier = "bun:sqlite";
	const { Database } = (await import(specifier)) as {
		Database: new (file: string) => SqliteDb;
	};
	return new Database(file);
}

// ── Better Auth ────────────────────────────────────────────────────────────

export interface BetterAuthCrypto {
	hashPassword(password: string): Promise<string>;
	verifyPassword(input: { hash: string; password: string }): Promise<boolean>;
}

/**
 * Better Auth's own password hashing, resolved through packages/auth (the
 * workspace that declares better-auth; the isolated linker does not expose it
 * at the repo root). Same version, same scrypt `salt:key` format the server
 * verifies against.
 */
export async function loadBetterAuthCrypto(): Promise<BetterAuthCrypto> {
	const require = createRequire(path.join(REPO_ROOT, "packages/auth/package.json"));
	const entry = require.resolve("better-auth/crypto");
	return (await import(pathToFileURL(entry).href)) as BetterAuthCrypto;
}

// ── Prompts ────────────────────────────────────────────────────────────────

async function readAllStdin(): Promise<string> {
	const chunks: Buffer[] = [];
	for await (const chunk of process.stdin) chunks.push(Buffer.from(chunk));
	return Buffer.concat(chunks).toString("utf8");
}

/**
 * Read one line without echoing it (a TTY), or the first line of piped stdin —
 * so a secret never has to appear in argv (shell history, `ps`).
 */
export async function readSecretLine(question: string): Promise<string> {
	const { stdin, stdout } = process;
	if (!stdin.isTTY) return (await readAllStdin()).split(/\r?\n/)[0] ?? "";
	stdout.write(question);
	stdin.setRawMode(true);
	stdin.resume();
	stdin.setEncoding("utf8");
	return new Promise((resolve, reject) => {
		let value = "";
		const done = (error?: Error) => {
			stdin.off("data", onData);
			stdin.setRawMode(false);
			stdin.pause();
			stdout.write("\n");
			if (error) reject(error);
			else resolve(value);
		};
		const onData = (chunk: string) => {
			for (const ch of chunk) {
				if (ch === "\r" || ch === "\n") return done();
				if (ch === "\u0003") return done(new Error("Cancelled."));
				if (ch === "\u007f" || ch === "\b") value = value.slice(0, -1);
				else value += ch;
			}
		};
		stdin.on("data", onData);
	});
}

/** Read one visible line from the terminal. */
export async function readLine(question: string): Promise<string> {
	const { createInterface } = await import("node:readline/promises");
	const rl = createInterface({ input: process.stdin, output: process.stdout });
	try {
		return await rl.question(question);
	} finally {
		rl.close();
	}
}

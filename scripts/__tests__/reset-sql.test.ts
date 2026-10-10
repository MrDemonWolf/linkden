// @vitest-environment node
import { beforeEach, describe, expect, it } from "vitest";
import { createTestDb } from "../../packages/db/src/testing";
import { loadBetterAuthCrypto } from "../lib/d1";
import {
	factoryResetStatements,
	isResettableTable,
	LIST_TABLES_SQL,
	normalizeEmail,
	passwordProblem,
	passwordResetSql,
} from "../lib/reset-sql";

type Client = Awaited<ReturnType<typeof createTestDb>>["client"];

const NOW = 1_760_000_000_000;

async function seedAdmin(client: Client) {
	await client.batch(
		[
			`INSERT INTO "user" (id, name, email, updated_at) VALUES ('u1', 'Admin', 'admin@example.com', ${NOW})`,
			`INSERT INTO account (id, account_id, provider_id, user_id, password, updated_at) VALUES ('a1', 'u1', 'credential', 'u1', 'old-salt:old-key', ${NOW})`,
			`INSERT INTO session (id, expires_at, token, updated_at, user_id) VALUES ('s1', ${NOW + 1e9}, 't1', ${NOW}, 'u1')`,
			`INSERT INTO session (id, expires_at, token, updated_at, user_id) VALUES ('s2', ${NOW + 1e9}, 't2', ${NOW}, 'u1')`,
		],
		"write",
	);
}

async function count(client: Client, table: string): Promise<number> {
	const res = await client.execute(`SELECT count(*) AS n FROM "${table}"`);
	return Number(res.rows[0]?.n);
}

describe("reset input validation", () => {
	it("normalises emails the way Better Auth stores them", () => {
		expect(normalizeEmail("  Admin@Example.COM ")).toBe("admin@example.com");
		expect(normalizeEmail("not-an-email")).toBeNull();
		expect(normalizeEmail("a b@example.com")).toBeNull();
	});

	it("enforces Better Auth's default password length bounds", () => {
		expect(passwordProblem("short")).toMatch(/at least 8/);
		expect(passwordProblem("x".repeat(129))).toMatch(/at most 128/);
		expect(passwordProblem("correct horse")).toBeNull();
	});
});

describe("passwordResetSql", () => {
	let client: Client;
	beforeEach(async () => {
		({ client } = await createTestDb());
		await seedAdmin(client);
	});

	it("stores a hash Better Auth verifies and signs every session out", async () => {
		const { hashPassword, verifyPassword } = await loadBetterAuthCrypto();
		const hash = await hashPassword("n3w-Passw0rd!");
		const sql = passwordResetSql("admin@example.com", hash, NOW + 5);

		await client.batch(sql.mutations, "write");
		const verify = await client.execute(sql.verify);
		expect(Number(verify.rows[0]?.updated)).toBe(1);

		const row = await client.execute("SELECT password, updated_at FROM account WHERE id = 'a1'");
		const stored = String(row.rows[0]?.password);
		expect(await verifyPassword({ hash: stored, password: "n3w-Passw0rd!" })).toBe(true);
		expect(await verifyPassword({ hash: stored, password: "wrong-password" })).toBe(false);
		expect(Number(row.rows[0]?.updated_at)).toBe(NOW + 5);
		expect(await count(client, "session")).toBe(0);
	});

	it("reports zero updated rows for an unknown email and changes nothing", async () => {
		const sql = passwordResetSql("someone@else.com", "salt:key", NOW);
		await client.batch(sql.mutations, "write");
		const verify = await client.execute(sql.verify);
		expect(Number(verify.rows[0]?.updated)).toBe(0);
		const row = await client.execute("SELECT password FROM account WHERE id = 'a1'");
		expect(row.rows[0]?.password).toBe("old-salt:old-key");
		expect(await count(client, "session")).toBe(2);
	});

	it("--disable-2fa removes the TOTP secret and clears the flag (lost authenticator)", async () => {
		await client.batch(
			[
				`UPDATE "user" SET two_factor_enabled = 1 WHERE id = 'u1'`,
				`INSERT INTO two_factor (id, secret, backup_codes, user_id) VALUES ('t1', 'enc', 'codes', 'u1')`,
			],
			"write",
		);
		const kept = passwordResetSql("admin@example.com", "s:k", NOW);
		expect(kept.mutations.join(";")).not.toContain("two_factor");

		const sql = passwordResetSql("admin@example.com", "s:k", NOW, { disableTwoFactor: true });
		await client.batch(sql.mutations, "write");
		expect(await count(client, "two_factor")).toBe(0);
		const flag = await client.execute(`SELECT two_factor_enabled FROM "user" WHERE id = 'u1'`);
		expect(Number(flag.rows[0]?.two_factor_enabled)).toBe(0);
	});

	it("matches the stored email case-insensitively and escapes quotes", () => {
		const sql = passwordResetSql("o'brien@example.com", "s:k", NOW);
		expect(sql.mutations[0]).toContain("lower(email) = 'o''brien@example.com'");
	});
});

describe("factoryResetStatements", () => {
	it("keeps internals and the migrations ledger out of the wipe", () => {
		for (const table of ["sqlite_sequence", "_cf_KV", "_cf_METADATA", "d1_migrations"]) {
			expect(isResettableTable(table)).toBe(false);
		}
		expect(isResettableTable("audit_log")).toBe(true);
		expect(factoryResetStatements(["user", "block", "audit_log", "d1_migrations"])).toEqual([
			"PRAGMA defer_foreign_keys = ON",
			'DELETE FROM "audit_log"',
			'DELETE FROM "block"',
			'DELETE FROM "user"',
		]);
	});

	it("empties every data table in one batch, including tables added later", async () => {
		const { client } = await createTestDb();
		await seedAdmin(client);
		await client.batch(
			[
				// Stand-ins for D1's own tables and for a table a future migration adds
				// (FK without cascade, sorting after "user").
				"CREATE TABLE d1_migrations (id integer primary key, name text)",
				"INSERT INTO d1_migrations (name) VALUES ('0000_init.sql')",
				"CREATE TABLE zz_plugin_child (id text primary key, user_id text not null references user(id))",
				"INSERT INTO zz_plugin_child (id, user_id) VALUES ('p1', 'u1')",
				`INSERT INTO block (id, type, position) VALUES ('b1', 'link', 0)`,
				`INSERT INTO link_click (id, block_id) VALUES ('c1', 'b1')`,
				`INSERT INTO site_settings (key, value) VALUES ('profile_name', 'Admin')`,
			],
			"write",
		);

		const listed = await client.execute(LIST_TABLES_SQL);
		const statements = factoryResetStatements(listed.rows.map((r) => String(r.name)));
		await client.batch(statements, "write");

		for (const table of [
			"user",
			"account",
			"session",
			"block",
			"link_click",
			"site_settings",
			"zz_plugin_child",
		]) {
			expect(await count(client, table)).toBe(0);
		}
		expect(await count(client, "d1_migrations")).toBe(1);
		// The single-admin trigger lets setup create the admin again.
		await client.execute(
			`INSERT INTO "user" (id, name, email, updated_at) VALUES ('u2', 'New', 'new@example.com', ${NOW})`,
		);
		expect(await count(client, "user")).toBe(1);
	});
});

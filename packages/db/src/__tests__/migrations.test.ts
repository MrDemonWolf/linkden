import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { type Client, createClient } from "@libsql/client";
import { describe, expect, it } from "vitest";

// Forward-only checks for the migrations that change existing data or the
// `user` table, applied in order the way Alchemy applies them.

const migrationsDir = join(dirname(fileURLToPath(import.meta.url)), "../migrations");
const files = readdirSync(migrationsDir)
	.filter((f) => f.endsWith(".sql"))
	.sort();

async function applyThrough(client: Client, lastPrefix: string, fromPrefix = "") {
	for (const file of files) {
		if (file < fromPrefix || file.slice(0, 4) > lastPrefix) continue;
		await client.executeMultiple(readFileSync(join(migrationsDir, file), "utf8"));
	}
}

async function freshClient() {
	const client = createClient({ url: ":memory:" });
	await client.execute("PRAGMA foreign_keys = ON;");
	return client;
}

describe("0008_two_factor", () => {
	it("adds the Better Auth two_factor table, drops the dead user columns, keeps the single-admin trigger", async () => {
		const client = await freshClient();
		await applyThrough(client, "0008");

		const cols = (await client.execute("PRAGMA table_info('two_factor')")).rows.map((r) => r.name);
		expect(cols).toEqual([
			"id",
			"secret",
			"backup_codes",
			"user_id",
			"verified",
			"failed_verification_count",
			"locked_until",
		]);

		const userCols = (await client.execute("PRAGMA table_info('user')")).rows.map((r) => r.name);
		expect(userCols).toContain("two_factor_enabled");
		expect(userCols).not.toContain("two_factor_secret");
		expect(userCols).not.toContain("two_factor_backup_codes");

		const trigger = await client.execute(
			"SELECT name FROM sqlite_master WHERE type = 'trigger' AND name = 'enforce_single_user'",
		);
		expect(trigger.rows).toHaveLength(1);
	});
});

describe("0009_auth_and_block_data_fixes", () => {
	it("marks the existing admin verified and turns legacy form blocks into connect blocks", async () => {
		const client = await freshClient();
		await applyThrough(client, "0008");

		await client.execute(
			"INSERT INTO user (id, name, email, email_verified) VALUES ('u1', 'Admin', 'a@example.com', 0)",
		);
		for (const [id, type] of [
			["b_form", "form"],
			["b_legacy", "contact_form"],
			["b_link", "link"],
		]) {
			await client.execute({
				sql: 'INSERT INTO block (id, type, position, config) VALUES (?, ?, 0, \'{"buttonText":"Say hi"}\')',
				args: [id as string, type as string],
			});
		}

		await applyThrough(client, "0009", "0009");

		const admin = await client.execute("SELECT email_verified FROM user WHERE id = 'u1'");
		expect(Number(admin.rows[0]?.email_verified)).toBe(1);

		const blocks = await client.execute("SELECT id, type, config FROM block ORDER BY id");
		expect(blocks.rows.map((r) => [r.id, r.type])).toEqual([
			["b_form", "connect"],
			["b_legacy", "connect"],
			["b_link", "link"],
		]);
		// Config is carried over untouched.
		expect(blocks.rows[0]?.config).toBe('{"buttonText":"Say hi"}');
	});
});

describe("0010_drop_social_icons_blocks", () => {
	it("removes retired social_icons blocks (and their clicks), keeps every other block", async () => {
		const client = await freshClient();
		await applyThrough(client, "0009");

		await client.batch(
			[
				"INSERT INTO block (id, type, position) VALUES ('b_icons', 'social_icons', 0)",
				"INSERT INTO block (id, type, position) VALUES ('b_link', 'link', 1)",
				"INSERT INTO link_click (id, block_id) VALUES ('c1', 'b_icons')",
				"INSERT INTO link_click (id, block_id) VALUES ('c2', 'b_link')",
			],
			"write",
		);

		await applyThrough(client, "0010", "0010");

		const blocks = await client.execute("SELECT id FROM block ORDER BY id");
		expect(blocks.rows.map((r) => r.id)).toEqual(["b_link"]);
		const clicks = await client.execute("SELECT id FROM link_click ORDER BY id");
		expect(clicks.rows.map((r) => r.id)).toEqual(["c2"]);
	});
});

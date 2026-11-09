// @vitest-environment node
import { createRequire } from "node:module";
import { extname } from "node:path";
import { fileURLToPath, URL } from "node:url";
import { beforeAll, describe, expect, it } from "vitest";
import type { createTestDb } from "../../db/src/testing";

const dbManifest = new URL("../../db/package.json", import.meta.url);
const dbRequire = createRequire(dbManifest);
const { createClient } = await import(dbRequire.resolve("@libsql/client"));
// Alchemy exposes an import-only entrypoint, but not the runner's private leaf modules.
const alchemyEntry = import.meta.resolve("alchemy/cloudflare");
const alchemyExtension = extname(fileURLToPath(alchemyEntry));
const { applyMigrations } = await import(
	new URL(`./d1-migrations${alchemyExtension}`, alchemyEntry).href
);
const { listSqlFiles } = await import(
	new URL(`./d1-sql-file${alchemyExtension}`, alchemyEntry).href
);
type Client = Awaited<ReturnType<typeof createTestDb>>["client"];
let migrations: { id: string; sql: string }[];
beforeAll(async () => {
	migrations = await listSqlFiles(fileURLToPath(new URL("./src/migrations", dbManifest)));
});

async function isolatedDatabase() {
	const client: Client = createClient({ url: ":memory:" });
	await client.execute("PRAGMA foreign_keys = ON");
	const requests: string[] = [];
	const api = {
		async post(path: string, { sql }: { sql: string }) {
			if (path !== "/accounts/fixture/d1/database/fixture/query") {
				throw new Error("Unexpected D1 endpoint");
			}
			requests.push(sql);
			let results: unknown[] = [];
			if (/^(PRAGMA|SELECT)\s[^;]*;?\s*$/i.test(sql.trim())) {
				results = (await client.execute(sql)).rows;
			} else {
				await client.executeMultiple(sql);
			}
			return Response.json({
				success: true,
				errors: [],
				messages: [],
				result: [{ success: true, results, meta: {} }],
			});
		},
	};
	const apply = (files = migrations) =>
		applyMigrations({
			api,
			accountId: "fixture",
			databaseId: "fixture",
			migrationsTable: "d1_migrations",
			migrationsFiles: files,
			quiet: true,
		});
	return { client, requests, apply };
}

async function existingContent(client: Client) {
	return Promise.all(
		[
			"SELECT * FROM user ORDER BY id",
			"SELECT * FROM two_factor ORDER BY id",
			"SELECT * FROM block ORDER BY id",
			"SELECT * FROM site_settings ORDER BY key",
		].map(async (sql) => (await client.execute(sql)).rows),
	);
}

async function seedContent(client: Client) {
	await client.executeMultiple(`
		INSERT INTO user (id,name,email,email_verified,two_factor_enabled)
		VALUES ('owner','Owner','owner@example.test',1,1);
		INSERT INTO two_factor (id,secret,backup_codes,user_id,verified)
		VALUES ('factor','fixture-secret','fixture-backup','owner',1);
		INSERT INTO site_settings (key,value) VALUES
			('avatar_url','https://foreign.example/api/images/avatar/unchanged.png'),
			('banner_custom_url','/api/images/banner/unchanged.png'),
			('branding_logo_url','https://cdn.example/logo.png'),
			('bio','Preserve profile copy');
		INSERT INTO block (id,type,position,url,config) VALUES
			('image','image',0,NULL,'{"src":"https://foreign.example/api/images/block_image/unchanged.png","alt":"Keep alt"}'),
			('link','link',1,'https://foreign.example/api/images/link-target','{"thumbnail":"https://cdn.example/thumbnail.png","label":"Keep card"}'),
			('relative','image',2,NULL,'{"src":"/api/images/block_image/unchanged.png"}');
	`);
}

async function seedFrozenRevision(client: Client) {
	await client.executeMultiple(`
		INSERT INTO publication_revision
			(revision,source_digest,target_id,renderer_source_id,public_origin,snapshot_json,created_at)
		VALUES ('frozen','digest','target','renderer','https://public.example','{"profile":{"name":"Frozen public"}}',1000000);
		UPDATE publication_revision SET status='publishing',runner_id='runner',started_at=1000001 WHERE revision='frozen';
		UPDATE publication_revision SET status='published',artifact_digest='artifact',deployment_id='deployment',
			provider_version_id='version',artifact_manifest_json='{}',finished_at=1000002 WHERE revision='frozen';
		UPDATE publication_state SET last_good_revision='frozen' WHERE id='site';
	`);
}

describe("Alchemy migration filename compatibility", () => {
	it("applies the complete current history to a fresh database", async () => {
		const { client, apply } = await isolatedDatabase();
		try {
			await apply();
			expect((await client.execute("SELECT name FROM d1_migrations ORDER BY name")).rows).toEqual(
				migrations.map(({ id }) => ({ name: id })),
			);
			const tables = (
				await client.execute("SELECT name FROM sqlite_master WHERE type='table'")
			).rows.map((row) => row.name);
			expect(tables).toEqual(
				expect.arrayContaining([
					"user",
					"contact_quota",
					"publication_revision",
					"publication_state",
				]),
			);
		} finally {
			client.close();
		}
	});

	it.each([
		{ label: "main through 0010", prefix: "0010", legacyImageMigration: false },
		{
			label: "dev with its extra applied 0011 image migration",
			prefix: "0010",
			legacyImageMigration: true,
		},
		{
			label: "a frozen publication through 0013",
			prefix: "0013",
			legacyImageMigration: false,
		},
	])(
		"upgrades $label without replaying applied files or changing stored content",
		async ({ prefix, legacyImageMigration }) => {
			const { client, requests, apply } = await isolatedDatabase();
			try {
				await apply(migrations.filter(({ id }) => id.slice(0, 4) <= prefix));
				if (legacyImageMigration) {
					// This ledger entry belongs to the existing dev history, not this source tree.
					await client.execute(
						"INSERT INTO d1_migrations (id,name,applied_at) VALUES ('00012','0011_relative_image_paths.sql','2026-11-02')",
					);
				}
				await seedContent(client);
				// Seeded before 0014 so the runner adds the approval columns over a frozen revision.
				if (prefix === "0013") await seedFrozenRevision(client);
				const contentBefore = await existingContent(client);
				const frozenBefore =
					prefix === "0013"
						? {
								revisions: (await client.execute("SELECT * FROM publication_revision")).rows,
								state: (await client.execute("SELECT * FROM publication_state")).rows,
							}
						: null;
				requests.length = 0;
				await apply();
				expect(await existingContent(client)).toEqual(contentBefore);
				if (frozenBefore) {
					// 0014 only adds columns: every pre-0014 value is unchanged.
					expect((await client.execute("SELECT * FROM publication_revision")).rows).toMatchObject(
						frozenBefore.revisions,
					);
					expect((await client.execute("SELECT * FROM publication_state")).rows).toMatchObject(
						frozenBefore.state,
					);
				} else {
					await seedFrozenRevision(client);
				}
				const names = (
					await client.execute("SELECT name FROM d1_migrations ORDER BY name")
				).rows.map((row) => row.name);
				expect(names).toEqual(
					[
						...migrations.map(({ id }) => id),
						...(legacyImageMigration ? ["0011_relative_image_paths.sql"] : []),
					].sort(),
				);
				const frozen = (await client.execute("SELECT * FROM publication_revision")).rows;
				const state = (await client.execute("SELECT * FROM publication_state")).rows;
				requests.length = 0;
				await apply();
				expect(requests.every((sql) => /^(PRAGMA|SELECT)\s/i.test(sql.trim()))).toBe(true);
				expect(await existingContent(client)).toEqual(contentBefore);
				expect((await client.execute("SELECT * FROM publication_revision")).rows).toEqual(frozen);
				expect((await client.execute("SELECT * FROM publication_state")).rows).toEqual(state);
				await expect(
					client.execute(
						"INSERT INTO user (id,name,email) VALUES ('second','Second','second@example.test')",
					),
				).rejects.toThrow(/Only one admin user/);
			} finally {
				client.close();
			}
		},
	);
});

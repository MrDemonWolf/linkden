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
	const rows = async (sql: string) => (await client.execute(sql)).rows.map((row) => ({ ...row }));
	return Promise.all([
		rows("SELECT * FROM user ORDER BY id"),
		rows("SELECT * FROM two_factor ORDER BY id"),
		rows("SELECT * FROM block ORDER BY id"),
		rows("SELECT * FROM site_settings ORDER BY key"),
	]);
}

async function seedContent(client: Client) {
	await client.executeMultiple(`
		INSERT INTO user (id,name,email,email_verified,two_factor_enabled)
		VALUES ('owner','Owner','owner@example.test',1,1);
		INSERT INTO two_factor (id,secret,backup_codes,user_id,verified)
		VALUES ('factor','fixture-secret','fixture-backup','owner',1);
		INSERT INTO site_settings (key,value) VALUES
			('avatar_url','https://api.example/api/images/avatar/a1.png'),
			('banner_custom_url','/api/images/banner/b1.png'),
			('branding_logo_url','https://cdn.example/logo.png'),
			('bio','Preserve profile copy');
		INSERT INTO block (id,type,position,url,config) VALUES
			('image','image',0,NULL,'{"src":"https://api.example/api/images/block_image/i1.png","alt":"Keep alt"}'),
			('link','link',1,'https://api.example/api/images/link-target','{"thumbnail":"https://cdn.example/thumbnail.png","label":"Keep card"}'),
			('relative','image',2,NULL,'{"src":"/api/images/block_image/r1.png"}');
	`);
}

type Content = Awaited<ReturnType<typeof existingContent>>;

// What 0011_relative_image_paths does to the seeded rows: absolute upload URLs in
// image settings and block `src`/`thumbnail` become origin-relative paths. Link
// targets, external images and already-relative paths are left alone.
function withRelativeImagePaths([users, factors, blocks, settings]: Content): Content {
	return [
		users,
		factors,
		blocks.map((row) =>
			row.id === "image"
				? { ...row, config: '{"src":"/api/images/block_image/i1.png","alt":"Keep alt"}' }
				: row,
		),
		settings.map((row) =>
			row.key === "avatar_url" ? { ...row, value: "/api/images/avatar/a1.png" } : row,
		),
	];
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

describe("Alchemy migration upgrades", () => {
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
		// Main's history: the upgrade runs the 0011 image-path rewrite over existing rows.
		{ label: "main through 0010", prefix: "0010", rewritesImagePaths: true },
		// Dev's history already ran 0011; the rest of the chain only adds tables and columns.
		{ label: "dev through 0011", prefix: "0011", rewritesImagePaths: false },
		{ label: "a frozen publication through 0014", prefix: "0014", rewritesImagePaths: false },
	])(
		"upgrades $label without replaying applied files or changing other stored content",
		async ({ prefix, rewritesImagePaths }) => {
			const { client, requests, apply } = await isolatedDatabase();
			try {
				await apply(migrations.filter(({ id }) => id.slice(0, 4) <= prefix));
				await seedContent(client);
				// Seeded before 0015 so the runner adds the approval columns over a frozen revision.
				if (prefix === "0014") await seedFrozenRevision(client);
				const contentBefore = await existingContent(client);
				const contentAfter = rewritesImagePaths
					? withRelativeImagePaths(contentBefore)
					: contentBefore;
				const frozenBefore =
					prefix === "0014"
						? {
								revisions: (await client.execute("SELECT * FROM publication_revision")).rows,
								state: (await client.execute("SELECT * FROM publication_state")).rows,
							}
						: null;
				requests.length = 0;
				await apply();
				expect(await existingContent(client)).toEqual(contentAfter);
				if (frozenBefore) {
					// 0015 only adds columns: every pre-0015 value is unchanged.
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
				expect(names).toEqual(migrations.map(({ id }) => id).sort());
				const frozen = (await client.execute("SELECT * FROM publication_revision")).rows;
				const state = (await client.execute("SELECT * FROM publication_state")).rows;
				requests.length = 0;
				await apply();
				expect(requests.every((sql) => /^(PRAGMA|SELECT)\s/i.test(sql.trim()))).toBe(true);
				expect(await existingContent(client)).toEqual(contentAfter);
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

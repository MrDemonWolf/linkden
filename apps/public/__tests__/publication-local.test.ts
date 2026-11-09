// @vitest-environment node
import { type ChildProcess, spawn, spawnSync } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { createServer } from "node:net";
import os from "node:os";
import path from "node:path";
import { afterAll, expect, it, vi } from "vitest";
import type { PublicSnapshot } from "../../../packages/validators/src/publication";
import { type PublicationDatabase, type PublicBuild, runPublication } from "../publish";
import { nativeAssetConfiguration } from "../stage";

type TestStore = Awaited<
	ReturnType<typeof import("../../../packages/db/src/testing").createTestDb>
>;
const store = vi.hoisted(() => ({
	value: null as TestStore | null,
	environment: { PUBLIC_SITE_URL: "", CORS_ORIGIN: "" },
}));
vi.mock("../../../packages/env/src/server", () => ({ env: store.environment }));
vi.mock("../../../packages/db/src/index", async () => {
	const { createTestDb } = await import("../../../packages/db/src/testing");
	store.value = await createTestDb();
	return { db: store.value.db };
});
const { createPublicationRouter } = await import("../../../packages/api/src/routers/publication");
afterAll(() => store.value?.client.close());

async function freeLoopbackPort() {
	const server = createServer();
	await new Promise<void>((resolve, reject) => {
		server.once("error", reject);
		server.listen(0, "127.0.0.1", resolve);
	});
	const address = server.address();
	if (!address || typeof address === "string") throw new Error("Missing isolated local port");
	await new Promise<void>((resolve, reject) =>
		server.close((error) => (error ? reject(error) : resolve())),
	);
	if ([13000, 13010].includes(address.port)) throw new Error("Refusing an owner development port");
	return address.port;
}

async function stop(child: ChildProcess | null) {
	if (!child?.pid || child.exitCode !== null || child.signalCode !== null) return;
	const closed = new Promise<void>((resolve) => child.once("close", () => resolve()));
	// This detached group contains only the fixture's Wrangler and workerd children.
	process.kill(-child.pid, "SIGTERM");
	const timer = setTimeout(() => {
		if (child.exitCode === null && child.signalCode === null) process.kill(-child.pid!, "SIGKILL");
	}, 2_000);
	try {
		await closed;
	} finally {
		clearTimeout(timer);
	}
}

it("publishes profile edits through protected APIs and native local assets", async () => {
	if (!store.value) throw new Error("Missing isolated SQLite fixture");
	const { client } = store.value;
	const root = process.cwd();
	const temporary = await mkdtemp(path.join(os.tmpdir(), "linkden-native-publication-"));
	const port = await freeLoopbackPort();
	const publicOrigin = `http://127.0.0.1:${port}`;
	store.environment.PUBLIC_SITE_URL = publicOrigin;
	store.environment.CORS_ORIGIN = "https://admin.example.test";
	const direct = "https://example.com/direct?source=profile#preserved";
	const firstDestination = "https://example.com/first?source=profile#saved";
	const editedDestination = "https://example.com/updated?source=profile#changed";
	let clock = Date.now();
	// Only the API clock changes: native subprocesses and timer/HTTP deadlines stay real.
	vi.useFakeTimers({ toFake: ["Date"] });
	vi.setSystemTime(clock);
	let child: ChildProcess | null = null;
	let logs = "";
	let built: PublicBuild | null = null;
	try {
		await client.execute(
			"INSERT INTO user (id,name,email,email_verified) VALUES ('admin','Public Fixture','PRIVATE_EMAIL@example.com',1)",
		);
		await client.batch(
			[
				{
					sql: "INSERT INTO site_settings (key,value) VALUES (?,?)",
					args: ["email_api_key", "PRIVATE_API_TOKEN"],
				},
				{
					sql: "INSERT INTO site_settings (key,value) VALUES (?,?)",
					args: ["wallet_signer_key", "PRIVATE_SIGNING_KEY"],
				},
				{
					sql: "INSERT INTO block (id,type,title,url,position,config) VALUES ('visible','link','Direct website',?,0,'{}')",
					args: [direct],
				},
				{
					sql: "INSERT INTO block (id,type,title,url,position,config) VALUES ('edited-link','link','Edited destination',?,1,'{}')",
					args: ["https://example.com/initial"],
				},
				{
					sql: "INSERT INTO block (id,type,position,status,config) VALUES ('draft','text',1,'draft',?)",
					args: ['{"body":"PRIVATE_DRAFT"}'],
				},
				{
					sql: "INSERT INTO block (id,type,position,is_enabled,config) VALUES ('disabled','text',2,0,?)",
					args: ['{"body":"PRIVATE_DISABLED"}'],
				},
				{
					sql: "INSERT INTO block (id,type,position,scheduled_start,config) VALUES ('future','text',3,?,?)",
					args: [Date.now() + 86_400_000, '{"body":"PRIVATE_FUTURE"}'],
				},
			],
			"write",
		);
		const dispatch = vi.fn(async () => {});
		const router = createPublicationRouter({
			configuration: () => ({
				enabled: true,
				targetId: "native-local-test",
				publicOrigin,
				rendererSourceId: "immutable-local-fixture",
			}),
			dispatch,
		});
		await expect(
			router.createCaller({ session: null, headers: new Headers() }).request(),
		).rejects.toMatchObject({ code: "UNAUTHORIZED" });
		const context = {
			session: { user: { id: "admin" } },
			headers: new Headers(),
		} as never;
		const caller = router.createCaller(context);
		const snapshots: PublicSnapshot[] = [];
		const database: PublicationDatabase = {
			async query(statement) {
				const result = await client.execute({ sql: statement.sql, args: statement.params });
				return { rows: result.rows.map((row) => ({ ...row })), changes: result.rowsAffected };
			},
			async batch(statements) {
				const results = await client.batch(
					statements.map((statement) => ({ sql: statement.sql, args: statement.params })),
					"write",
				);
				return results.map((result) => ({
					rows: result.rows.map((row) => ({ ...row })),
					changes: result.rowsAffected,
				}));
			},
		};
		async function publish(destination: string) {
			await client.execute({
				sql: "UPDATE block SET url = ? WHERE id = ?",
				args: [destination, "edited-link"],
			});
			clock += 60_000;
			vi.setSystemTime(clock);
			const before = await caller.status();
			expect(before.sourceDigest).toBeTypeOf("string");
			expect(before.approvalDigest).toBeTypeOf("string");
			const requested = await caller.request({
				expectedSourceDigest: before.sourceDigest!,
				expectedApprovalDigest: before.approvalDigest!,
			});
			const row = (
				await client.execute({
					sql: "SELECT snapshot_json FROM publication_revision WHERE revision = ?",
					args: [requested.revision],
				})
			).rows[0]!;
			const snapshot = JSON.parse(String(row.snapshot_json)) as PublicSnapshot;
			snapshots.push(snapshot);
			expect(dispatch).toHaveBeenCalledTimes(snapshots.length);
			expect(String(row.snapshot_json)).not.toContain("PRIVATE_");
			expect(snapshot.blocks.map((block) => block.id)).toEqual(["visible", "edited-link"]);
			expect(snapshot.blocks[0]?.url).toBe(direct);
			expect(snapshot.blocks[1]?.url).toBe(destination);
			expect(snapshot.nextVisibilityBoundary).not.toBeNull();
			const result = await runPublication({
				database,
				revision: requested.revision,
				runnerId: `native-local-runner-${snapshots.length}`,
				targetId: "native-local-test",
				rendererSourceId: "immutable-local-fixture",
				publicOrigin,
				async build(frozen) {
					expect(frozen).toEqual(snapshot);
					const input = path.join(temporary, "snapshot.json");
					const output = path.join(temporary, "output");
					await writeFile(input, JSON.stringify(frozen), { mode: 0o600 });
					const code = `import { buildStaticSnapshot } from "./apps/public/build.ts"; await buildStaticSnapshot(JSON.parse(await Bun.file(${JSON.stringify(input)}).text()), ${JSON.stringify(output)});`;
					const build = spawnSync("bun", ["-e", code], {
						cwd: root,
						encoding: "utf8",
						timeout: 16_000,
						maxBuffer: 1024 * 1024,
					});
					logs = (logs + build.stderr).slice(-16_384);
					expect(build.status, build.stderr).toBe(0);
					const artifactDirectory = path.join(output, frozen.revision);
					const manifest = JSON.parse(
						await readFile(path.join(artifactDirectory, "manifest.json"), "utf8"),
					);
					const html = await readFile(path.join(artifactDirectory, "index.html"), "utf8");
					expect(html).toContain("Public Fixture");
					expect(html).toContain(direct);
					expect(html).toContain(destination);
					expect(html).not.toContain("PRIVATE_");
					built = { destination: artifactDirectory, manifest };
					return built;
				},
				async stage(build) {
					expect(build).toBe(built);
					return { providerVersionId: `local-native-version-${snapshots.length}` };
				},
				async activate(candidate) {
					if (!built) throw new Error("Missing built local assets");
					await stop(child);
					child = null;
					const { account_id: _unusedAccount, ...configuration } = nativeAssetConfiguration(
						"a".repeat(32),
						"linkden-public-staging",
						built.destination,
					);
					const config = path.join(temporary, "wrangler.jsonc");
					await writeFile(config, JSON.stringify(configuration));
					child = spawn(
						process.execPath,
						[
							path.join(root, "apps/server/node_modules/wrangler/bin/wrangler.js"),
							"dev",
							"--config",
							config,
							"--local",
							"--ip",
							"127.0.0.1",
							"--port",
							String(port),
							"--inspector-port",
							"0",
							"--persist-to",
							path.join(temporary, "state"),
							"--log-level",
							"error",
						],
						{
							cwd: temporary,
							detached: true,
							stdio: ["ignore", "pipe", "pipe"],
							env: {
								PATH: process.env.PATH,
								CI: "true",
								NODE_ENV: "test",
								WRANGLER_SEND_METRICS: "false",
								CLOUDFLARE_LOAD_DEV_VARS_FROM_DOT_ENV: "false",
								CLOUDFLARE_INCLUDE_PROCESS_ENV: "false",
							},
						},
					);
					child.stdout?.on("data", (data) => {
						logs = (logs + data.toString()).slice(-16_384);
					});
					child.stderr?.on("data", (data) => {
						logs = (logs + data.toString()).slice(-16_384);
					});
					const deadline = performance.now() + 7_000;
					let ready = false;
					while (performance.now() < deadline) {
						if (child.exitCode !== null)
							throw new Error(`Native local asset server exited: ${logs}`);
						try {
							const response = await fetch(publicOrigin, { signal: AbortSignal.timeout(300) });
							ready = response.status === 200;
							await response.body?.cancel();
							if (ready) break;
						} catch {
							/* The owned local listener has not started yet. */
						}
						await new Promise((resolve) => setTimeout(resolve, 50));
					}
					if (!ready) throw new Error(`Native local asset server was not ready: ${logs}`);
					return {
						deploymentId: `local-native-deployment-${snapshots.length}`,
						providerVersionId: candidate.providerVersionId,
					};
				},
				async restore() {
					throw new Error("No rollback is expected in this successful local lifecycle proof");
				},
			});
			expect(result, `${JSON.stringify(result)}\n${logs}`).toMatchObject({
				status: "published",
				revision: requested.revision,
			});
			const status = await caller.status();
			expect(status).toMatchObject({
				status: "published",
				liveVerified: true,
				lastGood: { revision: requested.revision },
			});
			expect(JSON.stringify(status)).not.toContain("PRIVATE_");
		}
		await publish(firstDestination);
		await publish(editedDestination);
		expect(new Set(snapshots.map((snapshot) => snapshot.revision)).size).toBe(2);
	} finally {
		await stop(child);
		await rm(temporary, { recursive: true, force: true });
		vi.useRealTimers();
	}
}, 70_000);

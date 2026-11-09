// @vitest-environment node
import { createHash } from "node:crypto";
import { mkdir, mkdtemp, open, readFile, rm, symlink, writeFile } from "node:fs/promises";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { markPublicationRecoveryStatement } from "../../../packages/db/src/publication";
import { createTestDb } from "../../../packages/db/src/testing";
import {
	createPublicationSnapshot,
	type PublicSnapshot,
	publicationArtifactManifestJson,
	publicationSourceJson,
} from "../../../packages/validators/src/publication";
import {
	type PublicationDatabase,
	type PublicationRunnerOptions,
	type PublicBuild,
	runPublication,
	verifyPublishedSite,
} from "../publish";
import { createStaticSecurityFiles } from "../security";

const sha256 = (bytes: string | Uint8Array) => createHash("sha256").update(bytes).digest("hex");
const identity = { targetId: "local-test-adapter", rendererSourceId: "immutable-fixture-build" };
const cleanups: (() => Promise<void>)[] = [];
afterEach(async () => {
	for (const cleanup of cleanups.splice(0).reverse()) await cleanup();
});

/** A deliberately small fixture builder. The real Bun renderer has separate integration coverage. */
async function fixtureBuild(root: string, snapshot: PublicSnapshot): Promise<PublicBuild> {
	const destination = path.join(root, snapshot.revision);
	const html = `<!doctype html><html><head><script>globalThis.fixtureRevision="${snapshot.revision}"</script><script type="module" src="/assets/app.js"></script></head><body>${snapshot.profile.name}</body></html>`;
	const files = new Map<string, string>([
		["index.html", html],
		["404.html", "<!doctype html><html><body>Page not found</body></html>"],
		["snapshot.json", JSON.stringify(snapshot)],
		["assets/app.js", `export const revision = "${snapshot.revision}";`],
		...createStaticSecurityFiles({ html }),
	]);
	for (const [filename, contents] of files) {
		await mkdir(path.dirname(path.join(destination, filename)), { recursive: true });
		await writeFile(path.join(destination, filename), contents, { flag: "wx" });
	}
	const manifest = {
		schemaVersion: 1,
		revision: snapshot.revision,
		status: "local-test-fixture",
		files: [...files].map(([filename, contents]) => ({ path: filename, sha256: sha256(contents) })),
	};
	await writeFile(path.join(destination, "manifest.json"), JSON.stringify(manifest), {
		flag: "wx",
	});
	return { destination, manifest };
}

type Fault = "bytes" | "missing" | "not-found-bytes" | "security" | "cookie";
type FixtureVersion = { snapshot: PublicSnapshot; build: PublicBuild };
async function fixture() {
	const { client } = await createTestDb();
	const root = await mkdtemp(path.join(os.tmpdir(), "linkden-public-runner-"));
	let clock = Date.parse("2026-11-06T12:00:00Z");
	let live: FixtureVersion | null = null;
	let fault: { revision: string; kind: Fault } | null = null;
	const versions = new Map<string, FixtureVersion>();
	const events: string[] = [];
	const requests: {
		revision: string;
		pathname: string;
		method: string;
		cookie?: string;
		authorization?: string;
	}[] = [];
	const sqlCalls: string[] = [];
	let failCompletion = false;
	let lostCompletionAck = false;
	let unreadableAfterCommit = false;
	let reconciliationUnavailable = false;
	const database: PublicationDatabase = {
		async query(statement) {
			sqlCalls.push(statement.sql);
			if (reconciliationUnavailable && /^\s*select\b/i.test(statement.sql))
				throw new Error("Completion reconciliation is unavailable");
			const result = await client.execute({ sql: statement.sql, args: statement.params });
			return { rows: result.rows.map((row) => ({ ...row })), changes: result.rowsAffected };
		},
		async batch(statements) {
			events.push("receipt-batch");
			const queries = statements.map((statement) => ({
				sql: statement.sql,
				args: statement.params,
			}));
			if (failCompletion)
				queries[1] = { sql: "UPDATE table_that_does_not_exist SET value = 1", args: [] };
			const results = await client.batch(queries, "write");
			if (lostCompletionAck) {
				reconciliationUnavailable = unreadableAfterCommit;
				throw new Error("Receipt committed but its network acknowledgement was lost");
			}
			return results.map((result) => ({
				rows: result.rows.map((row) => ({ ...row })),
				changes: result.rowsAffected,
			}));
		},
	};

	async function serve(request: IncomingMessage, response: ServerResponse) {
		if (!live) {
			response.writeHead(503).end();
			return;
		}
		const active = live;
		const url = new URL(request.url ?? "/", "http://fixture.test");
		requests.push({
			revision: active.snapshot.revision,
			pathname: url.pathname,
			method: request.method ?? "GET",
			cookie: request.headers.cookie,
			authorization: request.headers.authorization,
		});
		events.push(`http:${active.snapshot.revision}:${request.method}:${url.pathname}`);
		const policy = await readFile(path.join(active.build.destination, "_headers"), "utf8");
		for (const line of policy.split("\n\n")[0]!.split("\n").slice(1)) {
			const header = line.match(/^\s+([^:]+):\s*(.+)$/);
			if (header) response.setHeader(header[1]!, header[2]!);
		}
		const activeFault = fault?.revision === active.snapshot.revision ? fault.kind : null;
		if (activeFault === "security") response.removeHeader("content-security-policy");
		if (activeFault === "cookie") response.setHeader("set-cookie", "fixture-session=unexpected");
		const filename = url.pathname === "/" ? "index.html" : url.pathname.slice(1);
		const allowed =
			active.build.manifest.files.some((file) => file.path === filename) &&
			!["_headers", "404.html"].includes(filename);
		let body = await readFile(path.join(active.build.destination, allowed ? filename : "404.html"));
		if (activeFault === "bytes" && filename === "assets/app.js")
			body = Buffer.from("wrong public asset bytes");
		if (activeFault === "not-found-bytes" && !allowed) body = Buffer.from("wrong 404 bytes");
		response.statusCode = allowed || activeFault === "missing" ? 200 : 404;
		response.setHeader("content-length", body.byteLength);
		response.end(request.method === "HEAD" ? undefined : body);
	}
	const server = createServer((request, response) => {
		void serve(request, response).catch(() => {
			response.writeHead(500).end();
		});
	});
	await new Promise<void>((resolve, reject) => {
		server.once("error", reject);
		server.listen(0, "127.0.0.1", resolve);
	});
	const address = server.address();
	if (!address || typeof address === "string") throw new Error("Missing local fixture port");
	const publicOrigin = `http://127.0.0.1:${address.port}`;
	cleanups.push(async () => {
		server.closeAllConnections();
		await new Promise<void>((resolve, reject) =>
			server.close((error) => (error ? reject(error) : resolve())),
		);
		client.close();
		await rm(root, { recursive: true, force: true });
	});

	async function enqueue(
		revision: string,
		options: { badDigest?: boolean; boundaryInMs?: number } = {},
	) {
		clock += 60_000;
		const snapshot = createPublicationSnapshot({
			revision,
			publicOrigin,
			builtAt: new Date(clock).toISOString(),
			profile: { name: `Published ${revision}`, image: null, bio: null, isVerified: false },
			settings: {},
			blocks: [],
			socialNetworks: [],
		});
		if (options.boundaryInMs !== undefined)
			snapshot.nextVisibilityBoundary = new Date(clock + options.boundaryInMs).toISOString();
		await client.execute({
			sql: "INSERT INTO publication_revision (revision, target_id, renderer_source_id, public_origin, source_digest, snapshot_json, created_at, next_visibility_boundary) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
			args: [
				revision,
				identity.targetId,
				identity.rendererSourceId,
				publicOrigin,
				options.badDigest ? "0".repeat(64) : sha256(publicationSourceJson(snapshot, identity)),
				JSON.stringify(snapshot),
				clock,
				snapshot.nextVisibilityBoundary ? Date.parse(snapshot.nextVisibilityBoundary) : null,
			],
		});
		return snapshot;
	}
	function options(snapshot: PublicSnapshot): PublicationRunnerOptions {
		return {
			database,
			...identity,
			publicOrigin,
			revision: snapshot.revision,
			runnerId: `runner-${snapshot.revision}`,
			now: () => clock,
			build: vi.fn(async (frozen) => {
				events.push(`build:${frozen.revision}`);
				expect(frozen).toEqual(snapshot);
				return fixtureBuild(root, frozen);
			}),
			stage: vi.fn(async (build) => {
				events.push(`stage:${snapshot.revision}`);
				const providerVersionId = `version-${snapshot.revision}`;
				versions.set(providerVersionId, { snapshot, build });
				return { providerVersionId };
			}),
			activate: vi.fn(async ({ providerVersionId }) => {
				events.push(`activate:${snapshot.revision}`);
				const version = versions.get(providerVersionId);
				if (!version) throw new Error("Unknown local test version");
				live = version;
				return { providerVersionId, deploymentId: `deployment-${snapshot.revision}` };
			}),
			restore: vi.fn(async (receipt) => {
				events.push(`restore:${receipt.providerVersionId}`);
				const version = versions.get(receipt.providerVersionId);
				if (!version) throw new Error("Unknown previous local test version");
				live = version;
			}),
		};
	}
	const nullable = (value: unknown) =>
		value === null || value === undefined ? null : String(value);
	async function state() {
		const row = (await client.execute("SELECT * FROM publication_state WHERE id = 'site'"))
			.rows[0]!;
		return {
			currentRevision: nullable(row.current_revision),
			lastGoodRevision: nullable(row.last_good_revision),
			recoveryRequired: Boolean(row.recovery_required),
			recoveryRevision: nullable(row.recovery_revision),
		};
	}
	async function revision(id: string) {
		const row = (
			await client.execute({
				sql: "SELECT * FROM publication_revision WHERE revision = ?",
				args: [id],
			})
		).rows[0]!;
		return {
			...row,
			status: String(row.status),
			artifactDigest: nullable(row.artifact_digest),
			artifactManifestJson: nullable(row.artifact_manifest_json),
			deploymentId: nullable(row.deployment_id),
			providerVersionId: nullable(row.provider_version_id),
		};
	}
	return {
		root,
		database,
		events,
		requests,
		sqlCalls,
		enqueue,
		options,
		state,
		revision,
		advance: (milliseconds: number) => {
			clock += milliseconds;
		},
		fault: (revision: string, kind: Fault) => {
			fault = { revision, kind };
		},
		active: () => live?.snapshot.revision,
		failCompletion: () => {
			failCompletion = true;
		},
		loseCompletionAck: (alsoLoseReconciliation = false) => {
			lostCompletionAck = true;
			unreadableAfterCommit = alsoLoseReconciliation;
		},
	};
}

describe("publication runner with real SQLite, files and local HTTP", () => {
	it("stops sequential sub-timeout asset requests at the real 120-second verification deadline", async () => {
		vi.useFakeTimers();
		const controllers: AbortController[] = [];
		const timeout = vi.spyOn(AbortSignal, "timeout").mockImplementation((milliseconds) => {
			const controller = new AbortController();
			controllers.push(controller);
			setTimeout(
				() => controller.abort(new DOMException("Timed out", "TimeoutError")),
				milliseconds,
			);
			return controller.signal;
		});
		let finished = 0;
		const bytes = "verified asset bytes";
		const transport = Object.assign(
			vi.fn(
				(_input: RequestInfo | URL, init?: RequestInit) =>
					new Promise<Response>((resolve, reject) => {
						const timer = setTimeout(() => {
							finished++;
							resolve(new Response(bytes));
						}, 9_000);
						const abort = () => {
							clearTimeout(timer);
							reject(init?.signal?.reason);
						};
						if (init?.signal?.aborted) abort();
						else init?.signal?.addEventListener("abort", abort, { once: true });
					}),
			),
			{ preconnect: vi.fn() },
		);
		const snapshot = createPublicationSnapshot({
			revision: "deadline",
			publicOrigin: "https://public.example.test",
			builtAt: new Date().toISOString(),
			profile: { name: "Fixture", image: null, bio: null, isVerified: false },
			settings: {},
			blocks: [],
			socialNetworks: [],
		});
		const manifest = {
			schemaVersion: 1 as const,
			revision: snapshot.revision,
			files: Array.from({ length: 30 }, (_, index) => ({
				path: `assets/${index}.js`,
				sha256: sha256(bytes),
			})),
		};
		let result: "pending" | "failed" | "passed" = "pending";
		let failure: unknown;
		const task = verifyPublishedSite(snapshot, manifest, transport).then(
			() => {
				result = "passed";
			},
			(error) => {
				result = "failed";
				failure = error;
			},
		);
		try {
			await vi.advanceTimersByTimeAsync(120_000);
			expect(result).toBe("failed");
			expect(failure).toMatchObject({ name: "TimeoutError" });
			expect(finished).toBe(13);
			expect(transport).toHaveBeenCalledTimes(14);
		} finally {
			for (const controller of controllers) controller.abort();
			await task;
			timeout.mockRestore();
			vi.useRealTimers();
		}
	});

	it("claims the frozen revision, stages and activates, verifies exact public behavior, then stores one atomic receipt", async () => {
		const h = await fixture();
		const snapshot = await h.enqueue("first");
		const options = h.options(snapshot);
		expect(await runPublication(options)).toMatchObject({
			status: "published",
			revision: "first",
			providerVersionId: "version-first",
			deploymentId: "deployment-first",
		});
		expect(await h.state()).toMatchObject({
			currentRevision: "first",
			lastGoodRevision: "first",
			recoveryRequired: false,
		});
		const stored = await h.revision("first");
		expect(stored).toMatchObject({
			status: "published",
			providerVersionId: "version-first",
			deploymentId: "deployment-first",
		});
		expect(stored.artifactDigest).toBe(sha256(stored.artifactManifestJson!));
		expect(publicationArtifactManifestJson(JSON.parse(stored.artifactManifestJson!))).toBe(
			stored.artifactManifestJson,
		);
		expect(h.events.indexOf("build:first")).toBeLessThan(h.events.indexOf("stage:first"));
		expect(h.events.indexOf("stage:first")).toBeLessThan(h.events.indexOf("activate:first"));
		expect(h.events.indexOf("activate:first")).toBeLessThan(
			h.events.findIndex((event) => event.startsWith("http:")),
		);
		expect(h.events.at(-1)).toBe("receipt-batch");
		expect(h.requests).toEqual(
			expect.arrayContaining([
				expect.objectContaining({ pathname: "/", method: "GET" }),
				expect.objectContaining({ pathname: "/", method: "HEAD" }),
				expect.objectContaining({ pathname: "/assets/app.js", method: "GET" }),
			]),
		);
		expect(
			h.requests.some((request) => request.pathname.startsWith("/__linkden-unpublished-")),
		).toBe(true);
		expect(h.requests.some((request) => request.pathname === "/404.html")).toBe(false);
		expect(h.requests.every((request) => !request.cookie && !request.authorization)).toBe(true);
		expect(h.sqlCalls.join("\n")).not.toMatch(
			/\bfrom (user|site_settings|block|contact_submission)\b/i,
		);
		expect(await runPublication({ ...options, runnerId: "another-runner" })).toEqual({
			status: "skipped",
		});
		expect(options.stage).toHaveBeenCalledTimes(1);
	});

	it("preserves last-good and never stages or activates a failed build", async () => {
		const h = await fixture();
		const previous = await h.enqueue("previous");
		expect((await runPublication(h.options(previous))).status).toBe("published");
		const candidate = await h.enqueue("candidate");
		const options = h.options(candidate);
		options.build = vi.fn(async () => {
			throw new Error("PRIVATE_BUILD_DIAGNOSTIC");
		});
		expect(await runPublication(options)).toMatchObject({ status: "failed", code: "build_failed" });
		expect(options.stage).not.toHaveBeenCalled();
		expect(options.activate).not.toHaveBeenCalled();
		expect(h.active()).toBe("previous");
		expect(await h.state()).toMatchObject({
			lastGoodRevision: "previous",
			recoveryRequired: false,
		});
		expect(JSON.stringify(await h.revision("candidate"))).not.toContain("PRIVATE_BUILD_DIAGNOSTIC");
	});

	it.each(["head", "boundary", "approval"])(
		"does not activate a staged revision after its %s becomes stale",
		async (cause) => {
			const h = await fixture();
			const candidate = await h.enqueue(
				"candidate",
				cause === "boundary" ? { boundaryInMs: 30_000 } : {},
			);
			const options = h.options(candidate);
			const stage = options.stage;
			options.stage = vi.fn(async (build) => {
				const staged = await stage(build);
				if (cause === "head") await h.enqueue("newer");
				else if (cause === "approval")
					await h.database.query({
						sql: "UPDATE publication_state SET approval_revision = ? WHERE id = 'site'",
						params: ["new-approval"],
					});
				else h.advance(30_000);
				return staged;
			});
			expect(await runPublication(options)).toMatchObject({
				status: "failed",
				code: "stale_request",
			});
			expect(options.activate).not.toHaveBeenCalled();
			expect(options.restore).not.toHaveBeenCalled();
			expect(h.active()).toBeUndefined();
			expect((await h.state()).lastGoodRevision).toBeNull();
		},
	);

	it.each<Fault>(["bytes", "missing", "not-found-bytes", "security", "cookie"])(
		"restores and verifies previous bytes after failed HTTP %s verification",
		async (kind) => {
			const h = await fixture();
			const previous = await h.enqueue("previous");
			expect((await runPublication(h.options(previous))).status).toBe("published");
			const candidate = await h.enqueue("candidate");
			h.fault("candidate", kind);
			h.requests.length = 0;
			const options = h.options(candidate);
			expect(await runPublication(options)).toMatchObject({
				status: "failed",
				code: "verification_failed",
			});
			expect(options.restore).toHaveBeenCalledWith({
				deploymentId: "deployment-previous",
				providerVersionId: "version-previous",
			});
			expect(h.active()).toBe("previous");
			expect(
				h.requests.some(
					(request) => request.revision === "previous" && request.pathname === "/assets/app.js",
				),
			).toBe(true);
			expect(
				h.requests.some(
					(request) =>
						request.revision === "previous" &&
						request.pathname.startsWith("/__linkden-unpublished-"),
				),
			).toBe(true);
			expect(await h.state()).toMatchObject({
				lastGoodRevision: "previous",
				recoveryRequired: false,
			});
		},
	);

	it("sets site-wide recovery required if a previous deployment cannot be restored", async () => {
		const h = await fixture();
		const previous = await h.enqueue("previous");
		expect((await runPublication(h.options(previous))).status).toBe("published");
		const candidate = await h.enqueue("candidate");
		h.fault("candidate", "bytes");
		const options = h.options(candidate);
		options.restore = vi.fn(async () => {
			throw new Error("RESTORE_UNCERTAIN");
		});
		expect(await runPublication(options)).toMatchObject({
			status: "failed",
			code: "recovery_required",
		});
		expect(await h.state()).toMatchObject({
			lastGoodRevision: "previous",
			recoveryRequired: true,
			recoveryRevision: "candidate",
		});
	});

	it("requires recovery when restore reports success but previous HTTP bytes fail verification", async () => {
		const h = await fixture();
		const previous = await h.enqueue("previous");
		expect((await runPublication(h.options(previous))).status).toBe("published");
		const candidate = await h.enqueue("candidate");
		h.fault("candidate", "bytes");
		const options = h.options(candidate);
		const restore = options.restore;
		options.restore = vi.fn(async (receipt) => {
			await restore(receipt);
			h.fault("previous", "bytes");
		});
		expect(await runPublication(options)).toMatchObject({
			status: "failed",
			code: "recovery_required",
		});
		expect(h.active()).toBe("previous");
		expect(await h.state()).toMatchObject({ lastGoodRevision: "previous", recoveryRequired: true });
	});

	it("sets recovery required for an uncertain first activation with no verified rollback version", async () => {
		const h = await fixture();
		const candidate = await h.enqueue("first");
		const options = h.options(candidate);
		const activate = options.activate;
		options.activate = vi.fn(async (version) => {
			await activate(version);
			throw new Error("Activation response lost");
		});
		expect(await runPublication(options)).toMatchObject({
			status: "failed",
			code: "recovery_required",
		});
		expect(h.active()).toBe("first");
		expect(await h.state()).toMatchObject({ lastGoodRevision: null, recoveryRequired: true });
	});

	it("rolls back SQLite completion atomically if receipt persistence fails", async () => {
		const h = await fixture();
		const previous = await h.enqueue("previous");
		expect((await runPublication(h.options(previous))).status).toBe("published");
		const candidate = await h.enqueue("candidate");
		h.failCompletion();
		expect(await runPublication(h.options(candidate))).toMatchObject({ status: "failed" });
		expect(h.active()).toBe("previous");
		expect(await h.state()).toMatchObject({
			lastGoodRevision: "previous",
			recoveryRequired: false,
		});
		expect(await h.revision("candidate")).toMatchObject({
			status: "failed",
			artifactDigest: null,
			deploymentId: null,
			providerVersionId: null,
		});
	});

	it("reconciles a committed receipt after a lost completion acknowledgement without rolling back", async () => {
		const h = await fixture();
		const previous = await h.enqueue("previous");
		expect((await runPublication(h.options(previous))).status).toBe("published");
		const candidate = await h.enqueue("candidate");
		const options = h.options(candidate);
		h.loseCompletionAck();
		expect(await runPublication(options)).toMatchObject({
			status: "published",
			revision: "candidate",
		});
		expect(options.restore).not.toHaveBeenCalled();
		expect(h.active()).toBe("candidate");
		expect(await h.revision("candidate")).toMatchObject({
			status: "published",
			deploymentId: "deployment-candidate",
		});
		expect(await h.state()).toMatchObject({
			lastGoodRevision: "candidate",
			recoveryRequired: false,
		});
	});

	it("keeps the verified candidate active and latches recovery if completion and reconciliation acknowledgements are lost", async () => {
		const h = await fixture();
		const previous = await h.enqueue("previous");
		expect((await runPublication(h.options(previous))).status).toBe("published");
		const candidate = await h.enqueue("candidate");
		const options = h.options(candidate);
		h.loseCompletionAck(true);
		expect(await runPublication(options)).toMatchObject({
			status: "failed",
			code: "recovery_required",
		});
		expect(options.restore).not.toHaveBeenCalled();
		expect(h.active()).toBe("candidate");
		// The commit did reach SQLite. Recovery is separate operational state,
		// so a terminal row cannot falsely claim the now-unverified live state.
		expect(await h.revision("candidate")).toMatchObject({ status: "published" });
		expect(await h.state()).toMatchObject({
			lastGoodRevision: "candidate",
			recoveryRequired: true,
			recoveryRevision: "candidate",
		});
	});

	it("latches recovery for an owned published receipt but rejects wrong runner or target identities", async () => {
		const h = await fixture();
		const snapshot = await h.enqueue("published");
		expect((await runPublication(h.options(snapshot))).status).toBe("published");
		const claim = {
			revision: snapshot.revision,
			runnerId: "runner-published",
			...identity,
			now: Date.parse(snapshot.builtAt),
		};
		for (const wrong of [
			{ ...claim, runnerId: "other-runner" },
			{ ...claim, targetId: "other-target" },
			{ ...claim, rendererSourceId: "other-source" },
		]) {
			expect((await h.database.query(markPublicationRecoveryStatement(wrong))).changes).toBe(0);
			expect((await h.state()).recoveryRequired).toBe(false);
		}
		expect((await h.database.query(markPublicationRecoveryStatement(claim))).changes).toBe(1);
		expect(await h.state()).toMatchObject({
			recoveryRequired: true,
			recoveryRevision: snapshot.revision,
		});
	});

	it.each(["tampered", "unlisted", "symlink", "oversized", "oversized-manifest"])(
		"rejects %s filesystem output before staging",
		async (kind) => {
			const h = await fixture();
			const candidate = await h.enqueue("candidate");
			const options = h.options(candidate);
			const build = options.build;
			options.build = vi.fn(async (snapshot) => {
				const result = await build(snapshot);
				if (kind === "tampered")
					await writeFile(path.join(result.destination, "index.html"), "changed after manifest");
				if (kind === "unlisted")
					await writeFile(path.join(result.destination, "unlisted-private.txt"), "PRIVATE");
				if (kind === "symlink")
					await symlink(
						path.join(result.destination, "index.html"),
						path.join(result.destination, "linked.html"),
					);
				if (kind === "oversized-manifest")
					await writeFile(
						path.join(result.destination, "manifest.json"),
						JSON.stringify({
							schemaVersion: 1,
							...result.manifest,
							diagnostic: "x".repeat(262_145),
						}),
					);
				if (kind === "oversized") {
					const size = 25 * 1024 * 1024 + 1;
					const large = await open(path.join(result.destination, "large.bin"), "w");
					await large.truncate(size);
					await large.close();
					// Hash the sparse zero file correctly, so only the size budget can reject it.
					const hash = createHash("sha256");
					const chunk = Buffer.alloc(64 * 1024);
					for (let remaining = size; remaining > 0; remaining -= chunk.length)
						hash.update(chunk.subarray(0, Math.min(remaining, chunk.length)));
					result.manifest.files.push({ path: "large.bin", sha256: hash.digest("hex") });
					await writeFile(
						path.join(result.destination, "manifest.json"),
						JSON.stringify({ schemaVersion: 1, ...result.manifest }),
					);
				}
				return result;
			});
			expect(await runPublication(options)).toMatchObject({
				status: "failed",
				code: "build_failed",
			});
			expect(options.stage).not.toHaveBeenCalled();
			expect(options.activate).not.toHaveBeenCalled();
			expect(await h.state()).toMatchObject({ lastGoodRevision: null, recoveryRequired: false });
		},
	);

	it.each(["digest", "origin"])(
		"rejects a frozen source with the wrong %s before building",
		async (kind) => {
			const h = await fixture();
			const candidate = await h.enqueue("candidate", { badDigest: kind === "digest" });
			const options = h.options(candidate);
			if (kind === "origin") options.publicOrigin = "https://unapproved.example.test";
			expect(await runPublication(options)).toMatchObject({
				status: "failed",
				code: "build_failed",
			});
			expect(options.build).not.toHaveBeenCalled();
			expect(options.stage).not.toHaveBeenCalled();
			expect(options.activate).not.toHaveBeenCalled();
		},
	);

	it("refuses a provider receipt that names a different version than the staged candidate", async () => {
		const h = await fixture();
		const previous = await h.enqueue("previous");
		expect((await runPublication(h.options(previous))).status).toBe("published");
		const candidate = await h.enqueue("candidate");
		const options = h.options(candidate);
		const activate = options.activate;
		options.activate = vi.fn(async (version) => ({
			...(await activate(version)),
			providerVersionId: "wrong-version",
		}));
		expect(await runPublication(options)).toMatchObject({
			status: "failed",
			code: "deployment_failed",
		});
		expect(options.restore).toHaveBeenCalled();
		expect(await h.state()).toMatchObject({
			lastGoodRevision: "previous",
			recoveryRequired: false,
		});
	});
});

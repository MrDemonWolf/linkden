// @vitest-environment node
import { createHash } from "node:crypto";
import { createServer } from "node:http";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
	claimPublicationStatement,
	completePublicationStatements,
} from "../../../packages/db/src/publication";
import { createTestDb } from "../../../packages/db/src/testing";
import {
	createPublicationSnapshot,
	type PublicSnapshot,
	publicationArtifactManifestJson,
	publicationSourceJson,
} from "../../../packages/validators/src/publication";
import { type PublicationDatabase, verifyPublishedSite } from "../publish";
import { type PublicationRecoveryOptions, recoverPublication } from "../recover";
import { createStaticSecurityFiles } from "../security";

const digest = (bytes: string) => createHash("sha256").update(bytes).digest("hex");
const identity = { targetId: "local-recovery-test", rendererSourceId: "previous-immutable-build" };
const cleanups: (() => Promise<void>)[] = [];
afterEach(async () => {
	for (const cleanup of cleanups.splice(0).reverse()) await cleanup();
});

/** Local test adapter only: real SQLite and HTTP, with immutable in-memory asset versions. */
async function fixture(status: "draft" | "publishing" = "publishing") {
	const { client } = await createTestDb();
	const clock = Date.parse("2026-11-06T12:10:00Z");
	const bodies = new Map<string, string>([
		["index.html", "<!doctype html><html><body>Verified previous profile</body></html>"],
		["404.html", "<!doctype html><html><body>Not found</body></html>"],
		["assets/profile.js", "export const profile = 'previous';"],
	]);
	for (const [key, value] of createStaticSecurityFiles({ html: bodies.get("index.html")! }))
		bodies.set(key, value);
	let restored = false;
	let wrongBytes = false;
	let wrongSecurity = false;
	const requests: { path: string; method: string; cookie?: string; authorization?: string }[] = [];
	const server = createServer((request, response) => {
		const url = new URL(request.url ?? "/", "http://fixture.test");
		requests.push({
			path: url.pathname,
			method: request.method ?? "GET",
			cookie: request.headers.cookie,
			authorization: request.headers.authorization,
		});
		for (const line of bodies.get("_headers")!.split("\n\n")[0]!.split("\n").slice(1)) {
			const header = line.match(/^\s+([^:]+):\s*(.+)$/);
			if (header) response.setHeader(header[1]!, header[2]!);
		}
		if (wrongSecurity) response.removeHeader("content-security-policy");
		const filename = url.pathname === "/" ? "index.html" : url.pathname.slice(1);
		const exists = bodies.has(filename) && filename !== "_headers";
		let body = bodies.get(exists ? filename : "404.html")!;
		if (!restored || wrongBytes) body = "Unverified candidate bytes";
		response.writeHead(exists ? 200 : 404, { "content-length": Buffer.byteLength(body) });
		response.end(request.method === "HEAD" ? undefined : body);
	});
	await new Promise<void>((resolve, reject) => {
		server.once("error", reject);
		server.listen(0, "127.0.0.1", resolve);
	});
	const address = server.address();
	if (!address || typeof address === "string") throw new Error("Missing fixture port");
	const publicOrigin = `http://127.0.0.1:${address.port}`;
	cleanups.push(async () => {
		server.closeAllConnections();
		await new Promise<void>((resolve, reject) =>
			server.close((error) => (error ? reject(error) : resolve())),
		);
		client.close();
	});
	const snapshot = (revision: string): PublicSnapshot =>
		createPublicationSnapshot({
			revision,
			publicOrigin,
			builtAt: new Date(clock).toISOString(),
			profile: { name: "Verified previous profile", image: null, bio: null, isVerified: false },
			settings: {},
			blocks: [],
			socialNetworks: [],
		});
	async function enqueue(revision: string, createdAt: number) {
		const frozen = snapshot(revision);
		await client.execute({
			sql: `INSERT INTO publication_revision (revision, source_digest, target_id, renderer_source_id, public_origin, snapshot_json, created_at)
VALUES (?, ?, ?, ?, ?, ?, ?)`,
			args: [
				revision,
				digest(publicationSourceJson(frozen, identity)),
				identity.targetId,
				identity.rendererSourceId,
				publicOrigin,
				JSON.stringify(frozen),
				createdAt,
			],
		});
		return frozen;
	}
	let lostAck = false;
	let refuseRelatch = false;
	let beforeCurrent: (() => Promise<void>) | undefined;
	const database: PublicationDatabase = {
		async query(statement) {
			if (
				refuseRelatch &&
				statement.sql.includes("recovery_revision IS NULL OR recovery_revision = ?1")
			)
				throw new Error("Database unavailable after completion");
			if (beforeCurrent && statement.sql.startsWith("SELECT r.revision")) {
				await beforeCurrent();
				beforeCurrent = undefined;
			}
			const result = await client.execute({ sql: statement.sql, args: statement.params });
			return { rows: result.rows.map((row) => ({ ...row })), changes: result.rowsAffected };
		},
		async batch(statements) {
			const results = await client.batch(
				statements.map((statement) => ({ sql: statement.sql, args: statement.params })),
				"write",
			);
			if (lostAck) throw new Error("Recovery committed but acknowledgement was lost");
			return results.map((result) => ({
				rows: result.rows.map((row) => ({ ...row })),
				changes: result.rowsAffected,
			}));
		},
	};
	await enqueue("last-good", clock - 120_000);
	const previousClaim = {
		...identity,
		revision: "last-good",
		runnerId: "original-runner",
		now: clock,
	};
	await database.query(claimPublicationStatement(previousClaim));
	const manifestJson = publicationArtifactManifestJson({
		schemaVersion: 1,
		revision: "last-good",
		files: [...bodies].map(([path, bytes]) => ({ path, sha256: digest(bytes) })),
	});
	await database.batch(
		completePublicationStatements({
			...previousClaim,
			artifactDigest: digest(manifestJson),
			artifactManifestJson: manifestJson,
			deploymentId: "original-deployment",
			providerVersionId: "immutable-last-good-version",
		}),
	);
	await enqueue("abandoned", clock - 60_000);
	if (status === "publishing")
		await database.query(
			claimPublicationStatement({
				...identity,
				revision: "abandoned",
				runnerId: "cancelled-runner",
				now: clock,
			}),
		);
	const activate = vi.fn(async (_version: { providerVersionId: string }) => {
		restored = true;
		return {
			deploymentId: "operator-restore-deployment",
			providerVersionId: "immutable-last-good-version",
		};
	});
	const options: PublicationRecoveryOptions = {
		database,
		revision: "abandoned",
		targetId: identity.targetId,
		publicOrigin,
		activate,
		now: () => clock,
	};
	async function state() {
		return (await client.execute("SELECT * FROM publication_state WHERE id = 'site'")).rows[0]!;
	}
	async function revision(id: string) {
		return (
			await client.execute({
				sql: "SELECT * FROM publication_revision WHERE revision = ?",
				args: [id],
			})
		).rows[0]!;
	}
	return {
		client,
		options,
		activate,
		requests,
		state,
		revision,
		enqueue: () => enqueue("new-request", clock + 60_000),
		loseAck: (alsoLoseRelatch = false) => {
			lostAck = true;
			refuseRelatch = alsoLoseRelatch;
		},
		acknowledge: () => {
			lostAck = false;
			refuseRelatch = false;
		},
		beforeCurrent: (callback: () => Promise<void>) => {
			beforeCurrent = callback;
		},
		wrongBytes: () => {
			wrongBytes = true;
		},
		wrongSecurity: () => {
			wrongSecurity = true;
		},
	};
}

describe("explicit operator publication recovery with real SQLite and local HTTP", () => {
	it.each(["draft", "publishing"] as const)(
		"fences requests, restores and verifies last-good, and fails an abandoned %s without taking over its runner",
		async (status) => {
			const h = await fixture(status);
			const receiptBefore = await h.revision("last-good");
			h.options.activate = vi.fn(async (version) => {
				expect((await h.state()).recovery_required).toBe(1);
				await expect(h.enqueue()).rejects.toThrow("publication_recovery_required");
				return h.activate(version);
			});
			expect(await recoverPublication(h.options)).toEqual({
				status: "recovered",
				revision: "abandoned",
				restoredRevision: "last-good",
				deploymentId: "operator-restore-deployment",
				providerVersionId: "immutable-last-good-version",
			});
			expect(await h.state()).toMatchObject({
				current_revision: "abandoned",
				last_good_revision: "last-good",
				recovery_required: 0,
				recovery_revision: null,
			});
			expect(await h.revision("abandoned")).toMatchObject({
				status: "failed",
				failure_code: "runner_failed",
				runner_id: status === "publishing" ? "cancelled-runner" : null,
			});
			expect(await h.revision("last-good")).toEqual(receiptBefore);
			expect(h.activate).toHaveBeenCalledWith({ providerVersionId: "immutable-last-good-version" });
			expect(h.requests).toEqual(
				expect.arrayContaining([
					expect.objectContaining({ path: "/", method: "HEAD" }),
					expect.objectContaining({ path: "/assets/profile.js", method: "GET" }),
				]),
			);
			expect(h.requests.some((request) => request.path.startsWith("/__linkden-unpublished-"))).toBe(
				true,
			);
			expect(
				h.requests.every(
					(request) => request.cookie === undefined && request.authorization === undefined,
				),
			).toBe(true);
			await expect(h.enqueue()).resolves.toBeDefined();
		},
	);

	it("retains the fence and refuses activation when no last-good exists", async () => {
		const h = await fixture();
		await h.client.execute("UPDATE publication_state SET last_good_revision = NULL");
		expect(await recoverPublication(h.options)).toMatchObject({
			status: "recovery_required",
			reason: "no_last_good",
		});
		expect(h.activate).not.toHaveBeenCalled();
		expect((await h.state()).recovery_required).toBe(1);
		expect((await h.revision("abandoned")).status).toBe("publishing");
	});

	it("recovers a delete-all-cleared current head without restoring cleared approval or current pointers", async () => {
		const h = await fixture();
		await h.client.execute(
			"UPDATE publication_state SET current_revision = NULL, approval_revision = NULL, generation = generation + 1, recovery_required = 1, recovery_revision = 'abandoned'",
		);
		expect(await recoverPublication(h.options)).toMatchObject({
			status: "recovered",
			restoredRevision: "last-good",
		});
		expect(await h.state()).toMatchObject({
			current_revision: null,
			approval_revision: null,
			recovery_required: 0,
			recovery_revision: null,
			last_good_revision: "last-good",
		});
		expect(await h.revision("abandoned")).toMatchObject({
			status: "failed",
			runner_id: "cancelled-runner",
			failure_code: "runner_failed",
		});
	});

	it.each(["targetId", "publicOrigin", "revision"] as const)(
		"does not activate or acquire a mismatched %s",
		async (field) => {
			const h = await fixture();
			const options = {
				...h.options,
				[field]: field === "publicOrigin" ? "https://another.example.test" : "another",
			};
			expect(await recoverPublication(options)).toMatchObject({
				status: "recovery_required",
				reason: "head_changed",
			});
			expect(h.activate).not.toHaveBeenCalled();
			expect((await h.state()).recovery_required).toBe(0);
		},
	);

	it.each(["digest", "manifest", "source", "providerVersion"] as const)(
		"refuses a corrupt last-good %s and keeps the fence",
		async (fault) => {
			const h = await fixture();
			if (fault === "digest")
				await h.client.execute(
					"UPDATE publication_revision SET artifact_digest = 'wrong' WHERE revision = 'last-good'",
				);
			if (fault === "manifest") {
				const previous = await h.revision("last-good");
				const manifest = JSON.parse(String(previous.artifact_manifest_json));
				manifest.files.reverse();
				const noncanonical = JSON.stringify(manifest);
				await h.client.execute({
					sql: "UPDATE publication_revision SET artifact_manifest_json = ?, artifact_digest = ? WHERE revision = 'last-good'",
					args: [noncanonical, digest(noncanonical)],
				});
			}
			if (fault === "source") {
				await h.client.execute("DROP TRIGGER publication_source_immutable");
				await h.client.execute(
					"UPDATE publication_revision SET source_digest = 'wrong' WHERE revision = 'last-good'",
				);
			}
			if (fault === "providerVersion")
				await h.client.execute(
					"UPDATE publication_revision SET provider_version_id = '' WHERE revision = 'last-good'",
				);
			expect(await recoverPublication(h.options)).toMatchObject({
				status: "recovery_required",
				reason: "invalid_last_good",
			});
			expect(h.activate).not.toHaveBeenCalled();
			expect((await h.state()).recovery_required).toBe(1);
		},
	);

	it("refuses a last-good receipt belonging to a different origin", async () => {
		const h = await fixture();
		await h.client.execute("DROP TRIGGER publication_source_immutable");
		await h.client.execute(
			"UPDATE publication_revision SET public_origin = 'https://other.example.test' WHERE revision = 'last-good'",
		);
		expect(await recoverPublication(h.options)).toMatchObject({ reason: "no_last_good" });
		expect(h.activate).not.toHaveBeenCalled();
		expect((await h.state()).recovery_required).toBe(1);
	});

	it("rechecks the captured generation before activation", async () => {
		const h = await fixture();
		h.beforeCurrent(async () => {
			await h.client.execute("UPDATE publication_state SET generation = generation + 1");
		});
		expect(await recoverPublication(h.options)).toMatchObject({ reason: "head_changed" });
		expect(h.activate).not.toHaveBeenCalled();
		expect((await h.state()).recovery_required).toBe(1);
	});

	it("never clears after provider activation acknowledgement is uncertain", async () => {
		const h = await fixture();
		h.options.activate = async (version) => {
			await h.activate(version);
			throw new Error("Network receipt lost");
		};
		expect(await recoverPublication(h.options)).toMatchObject({ reason: "restore_failed" });
		expect(h.requests).toHaveLength(0);
		expect((await h.state()).recovery_required).toBe(1);
	});

	it.each(["wrongBytes", "wrongSecurity"] as const)(
		"keeps recovery required when restored HTTP has %s",
		async (fault) => {
			const h = await fixture();
			h[fault]();
			expect(await recoverPublication(h.options)).toMatchObject({ reason: "verification_failed" });
			expect((await h.state()).recovery_required).toBe(1);
			expect((await h.revision("abandoned")).status).toBe("publishing");
		},
	);

	it("does not clear a different recovery identity arriving during HTTP verification", async () => {
		const h = await fixture();
		h.options.verify = async (snapshot, manifest) => {
			await verifyPublishedSite(snapshot, manifest);
			await h.client.execute("UPDATE publication_state SET recovery_revision = 'last-good'");
		};
		expect(await recoverPublication(h.options)).toMatchObject({ reason: "fence_unconfirmed" });
		expect(await h.state()).toMatchObject({ recovery_required: 1, recovery_revision: "last-good" });
		expect((await h.revision("abandoned")).status).toBe("publishing");
	});

	it("re-latches after a committed completion loses its ACK, then allows a separate explicit retry", async () => {
		const h = await fixture();
		h.loseAck();
		expect(await recoverPublication(h.options)).toMatchObject({
			reason: "database_acknowledgement_unknown",
		});
		expect(await h.state()).toMatchObject({
			recovery_required: 1,
			recovery_revision: "abandoned",
			last_good_revision: "last-good",
		});
		expect(await h.revision("abandoned")).toMatchObject({
			status: "failed",
			runner_id: "cancelled-runner",
			failure_code: "runner_failed",
		});
		h.acknowledge();
		expect(await recoverPublication(h.options)).toMatchObject({
			status: "recovered",
			restoredRevision: "last-good",
		});
		expect((await h.state()).recovery_required).toBe(0);
	});

	it("does not claim recovery when both completion ACK and protective relatch are unavailable", async () => {
		const h = await fixture();
		h.loseAck(true);
		expect(await recoverPublication(h.options)).toMatchObject({
			status: "recovery_required",
			reason: "fence_unconfirmed",
		});
		expect(h.activate).toHaveBeenCalledTimes(1);
	});
});

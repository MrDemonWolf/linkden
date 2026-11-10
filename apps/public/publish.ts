import { createHash } from "node:crypto";
import { lstat, readdir, readFile, realpath } from "node:fs/promises";
import path from "node:path";
import {
	claimPublicationStatement,
	completePublicationStatements,
	currentPublicationStatement,
	failPublicationStatement,
	markPublicationRecoveryStatement,
	type PublicationFailureCode,
	type PublicationStatement,
} from "../../packages/db/src/publication";
import {
	type PublicSnapshot,
	publicationArtifactManifestJson,
	publicationArtifactManifestSchema,
	publicationSourceJson,
	publicSnapshotSchema,
} from "../../packages/validators/src/publication";
import { inlineScriptHashes } from "./security";

export interface PublicationQueryResult {
	rows: Record<string, unknown>[];
	changes: number;
}
export interface PublicationDatabase {
	query(statement: PublicationStatement): Promise<PublicationQueryResult>;
	batch(statements: PublicationStatement[]): Promise<PublicationQueryResult[]>;
}
export interface PublicationReceipt {
	deploymentId: string;
	providerVersionId: string;
}
export type ArtifactManifest = ReturnType<typeof publicationArtifactManifestSchema.parse>;
export interface PublicBuild {
	destination: string;
	manifest: { revision: string; files: { path: string; sha256: string }[] };
}

const digest = (bytes: string | Uint8Array) => createHash("sha256").update(bytes).digest("hex");
const MAX_FILE_BYTES = 25 * 1024 * 1024;
const MAX_TOTAL_BYTES = 128 * 1024 * 1024;

/** Verify the entire immutable directory before any deployment, including unexpected files/symlinks. */
export async function verifyPublicBuild(build: PublicBuild): Promise<{
	manifest: ArtifactManifest;
	manifestJson: string;
	artifactDigest: string;
}> {
	const manifestJson = publicationArtifactManifestJson({
		schemaVersion: 1,
		revision: build.manifest.revision,
		files: build.manifest.files,
	});
	const manifest = publicationArtifactManifestSchema.parse(JSON.parse(manifestJson));
	for (const required of ["index.html", "404.html", "_headers", "sw.js"])
		if (!manifest.files.some((file) => file.path === required))
			throw new Error("A required public asset is missing");
	const root = await realpath(build.destination);
	const found = new Set<string>();
	let totalBytes = 0;
	async function walk(directory: string) {
		for (const entry of await readdir(directory, { withFileTypes: true })) {
			const file = path.join(directory, entry.name);
			if (entry.isSymbolicLink()) throw new Error("Publication assets cannot contain symlinks");
			if (entry.isDirectory()) await walk(file);
			else if (entry.isFile()) found.add(path.relative(root, file).split(path.sep).join("/"));
			else throw new Error("Publication contains an unsupported file");
		}
	}
	await walk(root);
	for (const file of manifest.files) {
		if (!found.delete(file.path)) throw new Error("A publication asset is missing");
		const filename = path.join(root, file.path);
		const info = await lstat(filename);
		totalBytes += info.size;
		if (info.size > MAX_FILE_BYTES || totalBytes > MAX_TOTAL_BYTES)
			throw new Error("Publication assets exceed the verified size budget");
		if (digest(await readFile(filename)) !== file.sha256)
			throw new Error("A publication asset digest changed");
	}
	if (!found.delete("manifest.json")) throw new Error("Publication manifest is missing");
	if ((await lstat(path.join(root, "manifest.json"))).size > 262_144)
		throw new Error("Publication manifest exceeds its byte budget");
	const storedManifest = await readFile(path.join(root, "manifest.json"), "utf8");
	const stored: unknown = JSON.parse(storedManifest);
	if (
		Buffer.byteLength(storedManifest) > 262_144 ||
		!stored ||
		typeof stored !== "object" ||
		publicationArtifactManifestJson({
			schemaVersion: Reflect.get(stored, "schemaVersion"),
			revision: Reflect.get(stored, "revision"),
			files: Reflect.get(stored, "files"),
		}) !== manifestJson
	)
		throw new Error("Stored publication manifest does not match its assets");
	if (found.size) throw new Error("Unlisted files reached the publication directory");
	return { manifest, manifestJson, artifactDigest: digest(manifestJson) };
}

export async function responseBytes(response: Response, remaining: number): Promise<Uint8Array> {
	const length = response.headers.get("content-length");
	if (length && (!/^\d+$/.test(length) || Number(length) > remaining)) {
		await response.body?.cancel();
		throw new Error("Published response exceeds its byte budget");
	}
	const reader = response.body?.getReader();
	const parts: Uint8Array[] = [];
	let size = 0;
	if (reader) {
		try {
			while (true) {
				const next = await reader.read();
				if (next.done) break;
				size += next.value.byteLength;
				if (size > remaining) throw new Error("Published response exceeds its byte budget");
				parts.push(next.value);
			}
		} finally {
			await reader.cancel();
			reader.releaseLock();
		}
	}
	const bytes = new Uint8Array(size);
	let offset = 0;
	for (const part of parts) {
		bytes.set(part, offset);
		offset += part.byteLength;
	}
	return bytes;
}

function verifySecurityHeaders(response: Response, html?: string) {
	const policy = response.headers.get("content-security-policy") ?? "";
	const scripts =
		policy
			.split(";")
			.map((part) => part.trim())
			.find((part) => part.startsWith("script-src ")) ?? "";
	if (
		response.headers.get("x-content-type-options") !== "nosniff" ||
		response.headers.get("referrer-policy") !== "no-referrer" ||
		response.headers.get("x-frame-options")?.toLowerCase() !== "deny" ||
		!policy.includes("object-src 'none'") ||
		!policy.includes("base-uri 'none'") ||
		!policy.includes("frame-ancestors 'none'") ||
		!scripts.includes("'self'") ||
		/unsafe-inline|unsafe-eval/.test(scripts) ||
		(html !== undefined && inlineScriptHashes(html).some((hash) => !scripts.includes(hash)))
	)
		throw new Error("Published security headers do not match the static policy");
}

/** Real HTTP checks: exact bytes and a real 404, without cookies or auth. */
export async function verifyPublishedSite(
	snapshot: PublicSnapshot,
	manifest: ArtifactManifest,
	transport: typeof fetch = fetch,
): Promise<void> {
	if (manifest.revision !== snapshot.revision) throw new Error("Publication revision mismatch");
	const headers = { "Cache-Control": "no-cache" };
	const deadline = AbortSignal.timeout(120_000);
	const signal = () => AbortSignal.any([deadline, AbortSignal.timeout(10_000)]);
	let totalBytes = 0;
	for (const file of manifest.files) {
		deadline.throwIfAborted();
		if (["_headers", "404.html"].includes(file.path)) continue;
		const url = new URL(`/${file.path}`, snapshot.publicOrigin);
		if (file.path === "index.html") url.pathname = "/";
		url.searchParams.set("linkden_verify", snapshot.revision);
		const response = await transport(url, {
			headers,
			redirect: "manual",
			signal: signal(),
		});
		if (response.status !== 200 || response.headers.has("set-cookie")) {
			await response.body?.cancel();
			throw new Error("A public asset is unavailable or returned a cookie");
		}
		const bytes = await responseBytes(
			response,
			Math.min(MAX_FILE_BYTES, MAX_TOTAL_BYTES - totalBytes),
		);
		totalBytes += bytes.byteLength;
		if (digest(bytes) !== file.sha256) throw new Error("Published bytes do not match the artifact");
		if (file.path === "index.html")
			verifySecurityHeaders(response, new TextDecoder().decode(bytes));
	}
	const head = await transport(`${snapshot.publicOrigin}/`, {
		method: "HEAD",
		headers,
		redirect: "manual",
		signal: signal(),
	});
	if (head.status !== 200 || head.headers.has("set-cookie")) {
		await head.body?.cancel();
		throw new Error("Published HEAD response is invalid");
	}
	await head.body?.cancel();
	verifySecurityHeaders(head);
	const missing = await transport(
		new URL(`/__linkden-unpublished-${crypto.randomUUID()}`, snapshot.publicOrigin),
		{
			headers,
			redirect: "manual",
			signal: signal(),
		},
	);
	if (missing.status !== 404 || missing.headers.has("set-cookie")) {
		await missing.body?.cancel();
		throw new Error("Unpublished public paths must return a static 404");
	}
	const notFound = manifest.files.find((file) => file.path === "404.html");
	const notFoundBytes = await responseBytes(
		missing,
		Math.min(MAX_FILE_BYTES, MAX_TOTAL_BYTES - totalBytes),
	);
	if (!notFound || digest(notFoundBytes) !== notFound.sha256)
		throw new Error("Public 404 does not match the static artifact");
	verifySecurityHeaders(missing);
}

export interface PublicationRunnerOptions {
	database: PublicationDatabase;
	revision: string;
	runnerId: string;
	targetId: string;
	rendererSourceId: string;
	publicOrigin: string;
	build(snapshot: PublicSnapshot): Promise<PublicBuild>;
	stage(build: PublicBuild): Promise<{ providerVersionId: string }>;
	activate(version: { providerVersionId: string }): Promise<PublicationReceipt>;
	restore(receipt: PublicationReceipt): Promise<void>;
	verify?: typeof verifyPublishedSite;
	now?: () => number;
}

/** One claimed, immutable revision. The provider adapter must also serialize runs per target. */
export async function runPublication(options: PublicationRunnerOptions) {
	const { database } = options;
	const now = options.now ?? Date.now;
	const claim = () => ({
		revision: options.revision,
		runnerId: options.runnerId,
		targetId: options.targetId,
		rendererSourceId: options.rendererSourceId,
		now: now(),
	});
	const claimed = await database.query(claimPublicationStatement(claim()));
	if (claimed.rows.length === 0) return { status: "skipped" as const };
	let code: PublicationFailureCode = "build_failed";
	let activationAttempted = false;
	let previous: {
		snapshot: PublicSnapshot;
		manifest: ArtifactManifest;
		receipt: PublicationReceipt;
	} | null = null;
	try {
		const row = claimed.rows[0]!;
		const snapshot = publicSnapshotSchema.parse(JSON.parse(String(row.snapshot_json)));
		if (
			snapshot.revision !== options.revision ||
			snapshot.publicOrigin !== options.publicOrigin ||
			digest(
				publicationSourceJson(snapshot, {
					targetId: options.targetId,
					rendererSourceId: options.rendererSourceId,
				}),
			) !== row.source_digest
		)
			throw new Error("Frozen publication source does not match its identity");
		const old = await database.query({
			sql: `SELECT snapshot_json, artifact_manifest_json, artifact_digest, deployment_id, provider_version_id FROM publication_revision
WHERE revision = (SELECT last_good_revision FROM publication_state WHERE id = 'site')
AND target_id = ?1 AND public_origin = ?2 AND status = 'published'`,
			params: [options.targetId, options.publicOrigin],
		});
		if (old.rows[0]) {
			const r = old.rows[0];
			if (digest(String(r.artifact_manifest_json)) !== r.artifact_digest)
				throw new Error("Verified rollback manifest is corrupted");
			previous = {
				snapshot: publicSnapshotSchema.parse(JSON.parse(String(r.snapshot_json))),
				manifest: publicationArtifactManifestSchema.parse(
					JSON.parse(String(r.artifact_manifest_json)),
				),
				receipt: {
					deploymentId: String(r.deployment_id),
					providerVersionId: String(r.provider_version_id),
				},
			};
		}
		const build = await options.build(snapshot);
		const checked = await verifyPublicBuild(build);
		if (checked.manifest.revision !== snapshot.revision) throw new Error("Built revision mismatch");
		code = "deployment_failed";
		const candidate = await options.stage(build);
		code = "stale_request";
		if (!(await database.query(currentPublicationStatement(claim()))).rows.length)
			throw new Error("Publication was superseded or expired before activation");
		code = "deployment_failed";
		activationAttempted = true;
		const receipt = await options.activate(candidate);
		if (receipt.providerVersionId !== candidate.providerVersionId)
			throw new Error("Deployment receipt does not match the staged version");
		code = "verification_failed";
		await (options.verify ?? verifyPublishedSite)(snapshot, checked.manifest);
		try {
			const completed = await database.batch(
				completePublicationStatements({
					...claim(),
					...receipt,
					artifactDigest: checked.artifactDigest,
					artifactManifestJson: checked.manifestJson,
				}),
			);
			if (completed[0]?.changes !== 1 || completed[1]?.changes !== 1)
				throw new Error("Publication changed before verification completed");
		} catch {
			// A lost acknowledgement may follow a committed receipt; never roll that version back.
			let reconciled: PublicationQueryResult;
			try {
				reconciled = await database.query({
					sql: `SELECT r.status, r.artifact_digest, r.deployment_id, r.provider_version_id, r.artifact_manifest_json,
s.last_good_revision, s.recovery_required FROM publication_revision r CROSS JOIN publication_state s
WHERE r.revision = ?1 AND r.runner_id = ?2 AND r.target_id = ?3 AND r.renderer_source_id = ?4 AND s.id = 'site'`,
					params: [options.revision, options.runnerId, options.targetId, options.rendererSourceId],
				});
			} catch {
				activationAttempted = false;
				code = "recovery_required";
				await database.query(markPublicationRecoveryStatement(claim()));
				return {
					status: "failed" as const,
					revision: options.revision,
					code: "recovery_required" as const,
				};
			}
			const committed = reconciled.rows[0];
			if (committed?.status === "published") {
				if (
					committed.artifact_digest !== checked.artifactDigest ||
					committed.deployment_id !== receipt.deploymentId ||
					committed.provider_version_id !== receipt.providerVersionId ||
					committed.artifact_manifest_json !== checked.manifestJson ||
					committed.last_good_revision !== options.revision ||
					committed.recovery_required !== 0
				) {
					activationAttempted = false;
					code = "recovery_required";
					await database.query(markPublicationRecoveryStatement(claim()));
					return {
						status: "failed" as const,
						revision: options.revision,
						code: "recovery_required" as const,
					};
				}
			} else {
				code = "stale_request";
				throw new Error("Publication receipt did not commit");
			}
		}
		return { status: "published" as const, revision: snapshot.revision, ...receipt };
	} catch {
		if (activationAttempted) {
			try {
				if (!previous) throw new Error("No verified version is available to restore");
				await options.restore(previous.receipt);
				await (options.verify ?? verifyPublishedSite)(previous.snapshot, previous.manifest);
			} catch {
				code = "recovery_required";
			}
		}
		await database.query(
			failPublicationStatement({
				revision: options.revision,
				runnerId: options.runnerId,
				code,
				now: now(),
			}),
		);
		return { status: "failed" as const, revision: options.revision, code };
	}
}

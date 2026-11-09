import { createHash } from "node:crypto";
import {
	acquirePublicationRecoveryStatement,
	completePublicationRecoveryStatements,
	currentPublicationRecoveryStatement,
	type PublicationRecoveryFence,
	type PublicationRecoveryIdentity,
	relatchPublicationRecoveryStatement,
} from "../../packages/db/src/publication";
import {
	MAX_PUBLIC_ARTIFACT_MANIFEST_BYTES,
	type PublicSnapshot,
	publicationArtifactManifestJson,
	publicationArtifactManifestSchema,
	publicationCompletionSchema,
	publicationSourceJson,
	publicSnapshotSchema,
} from "../../packages/validators/src/publication";
import {
	type ArtifactManifest,
	type PublicationDatabase,
	type PublicationQueryResult,
	type PublicationReceipt,
	verifyPublishedSite,
} from "./publish";

export interface PublicationRecoveryOptions extends PublicationRecoveryIdentity {
	database: PublicationDatabase;
	activate(version: { providerVersionId: string }): Promise<PublicationReceipt>;
	verify?: typeof verifyPublishedSite;
	now?: () => number;
}

export type PublicationRecoveryFailure =
	| "head_changed"
	| "fence_unconfirmed"
	| "no_last_good"
	| "invalid_last_good"
	| "restore_failed"
	| "verification_failed"
	| "database_acknowledgement_unknown";

const digest = (text: string) => createHash("sha256").update(text).digest("hex");

/**
 * Trusted, explicit operator action, serialized with publication for this target by CI.
 * It never takes over a runner, builds mutable source, or replaces a historical receipt.
 */
export async function recoverPublication(options: PublicationRecoveryOptions) {
	const { database, revision, targetId, publicOrigin } = options;
	const failed = (reason: PublicationRecoveryFailure) => ({
		status: "recovery_required" as const,
		revision,
		reason,
	});
	let acquired: PublicationQueryResult;
	try {
		acquired = await database.query(
			acquirePublicationRecoveryStatement({ revision, targetId, publicOrigin }),
		);
	} catch {
		return failed("fence_unconfirmed");
	}
	if (acquired.rows.length !== 1) return failed("head_changed");
	const state = acquired.rows[0]!;
	if (typeof state.last_good_revision !== "string") return failed("no_last_good");
	let fence: PublicationRecoveryFence;
	let snapshot: PublicSnapshot;
	let manifest: ArtifactManifest;
	let providerVersionId: string;
	try {
		const current = await database.query({
			sql: "SELECT status, runner_id FROM publication_revision WHERE revision = ?1 AND target_id = ?2 AND public_origin = ?3",
			params: [revision, targetId, publicOrigin],
		});
		const head = current.rows[0];
		if (
			!head ||
			!Number.isSafeInteger(state.generation) ||
			!(state.current_revision === null || state.current_revision === revision) ||
			!["draft", "publishing", "published", "failed"].includes(String(head.status)) ||
			!(head.runner_id === null || typeof head.runner_id === "string")
		)
			throw new Error("Invalid recovery head");
		fence = {
			revision,
			targetId,
			publicOrigin,
			currentRevision: state.current_revision,
			generation: Number(state.generation),
			lastGoodRevision: state.last_good_revision,
			runnerId: head.runner_id,
			status: head.status as PublicationRecoveryFence["status"],
		};
		const previous = await database.query({
			sql: `SELECT r.revision, r.snapshot_json, r.source_digest, r.renderer_source_id, r.artifact_manifest_json,
r.artifact_digest, r.deployment_id, r.provider_version_id FROM publication_revision r
WHERE r.revision = ?1 AND r.target_id = ?2 AND r.public_origin = ?3 AND r.status = 'published'`,
			params: [fence.lastGoodRevision, targetId, publicOrigin],
		});
		const row = previous.rows[0];
		if (!row) return failed("no_last_good");
		if (
			typeof row.snapshot_json !== "string" ||
			typeof row.artifact_manifest_json !== "string" ||
			Buffer.byteLength(row.artifact_manifest_json) > MAX_PUBLIC_ARTIFACT_MANIFEST_BYTES
		)
			throw new Error("Invalid recovery receipt");
		snapshot = publicSnapshotSchema.parse(JSON.parse(row.snapshot_json));
		manifest = publicationArtifactManifestSchema.parse(JSON.parse(row.artifact_manifest_json));
		if (
			snapshot.revision !== fence.lastGoodRevision ||
			snapshot.publicOrigin !== publicOrigin ||
			manifest.revision !== snapshot.revision ||
			publicationArtifactManifestJson(manifest) !== row.artifact_manifest_json ||
			digest(row.artifact_manifest_json) !== row.artifact_digest ||
			digest(
				publicationSourceJson(snapshot, {
					targetId,
					rendererSourceId: String(row.renderer_source_id),
				}),
			) !== row.source_digest
		)
			throw new Error("Recovery source or receipt identity mismatch");
		for (const path of ["index.html", "404.html", "_headers", "sw.js"])
			if (!manifest.files.some((file) => file.path === path))
				throw new Error("Required recovery asset missing");
		publicationCompletionSchema.shape.deploymentId.parse(row.deployment_id);
		providerVersionId = publicationCompletionSchema.shape.providerVersionId.parse(
			row.provider_version_id,
		);
	} catch {
		return failed("invalid_last_good");
	}
	try {
		if (!(await database.query(currentPublicationRecoveryStatement(fence))).rows.length)
			return failed("head_changed");
	} catch {
		return failed("fence_unconfirmed");
	}
	let receipt: PublicationReceipt;
	try {
		receipt = await options.activate({ providerVersionId });
		publicationCompletionSchema.shape.deploymentId.parse(receipt.deploymentId);
		if (receipt.providerVersionId !== providerVersionId)
			throw new Error("Recovery receipt does not match the last-good version");
	} catch {
		return failed("restore_failed");
	}
	try {
		await (options.verify ?? verifyPublishedSite)(snapshot, manifest);
	} catch {
		return failed("verification_failed");
	}
	try {
		const completed = await database.batch(
			completePublicationRecoveryStatements({ ...fence, now: (options.now ?? Date.now)() }),
		);
		const pending = ["draft", "publishing"].includes(fence.status);
		if (completed[0]?.changes !== (pending ? 1 : 0) || completed[1]?.changes !== 1)
			throw new Error("Recovery identity changed before completion");
	} catch {
		try {
			const latched = await database.query(relatchPublicationRecoveryStatement(fence));
			if (latched.changes !== 1) return failed("fence_unconfirmed");
		} catch {
			return failed("fence_unconfirmed");
		}
		return failed("database_acknowledgement_unknown");
	}
	return {
		status: "recovered" as const,
		revision,
		restoredRevision: snapshot.revision,
		...receipt,
	};
}

/** Parameterized SQL shared by the authenticated API and credentialed CI runner. */
import {
	type PublicationFailureCode,
	publicationCompletionSchema,
	publicationFailureSchema,
	publicationRunnerClaimSchema,
} from "@linkden/validators/publication";

export interface PublicationStatement {
	sql: string;
	params: (string | number | null)[];
}

export {
	PUBLICATION_FAILURE_CODES,
	type PublicationFailureCode,
} from "@linkden/validators/publication";

export interface PublicationClaim {
	revision: string;
	runnerId: string;
	targetId: string;
	rendererSourceId: string;
	now: number;
}

/** Exactly one runner can claim the current non-expired revision. Same-run retries are idempotent. */
export function claimPublicationStatement(input: PublicationClaim): PublicationStatement {
	publicationRunnerClaimSchema.parse(input);
	return {
		sql: `UPDATE publication_revision SET status = 'publishing', runner_id = ?2, started_at = coalesce(started_at, ?5)
WHERE revision = ?1 AND target_id = ?3 AND renderer_source_id = ?4
AND (status = 'draft' OR (status = 'publishing' AND runner_id = ?2))
AND (next_visibility_boundary IS NULL OR next_visibility_boundary > ?5)
AND EXISTS (SELECT 1 FROM publication_state WHERE id = 'site' AND current_revision = ?1 AND recovery_required = 0
AND publication_state.approval_revision IS publication_revision.approval_revision)
RETURNING revision, source_digest, target_id, renderer_source_id, public_origin, snapshot_json, next_visibility_boundary`,
		params: [input.revision, input.runnerId, input.targetId, input.rendererSourceId, input.now],
	};
}

/** Recheck immediately before deploying; workflow concurrency supplies single-writer serialization. */
export function currentPublicationStatement(input: PublicationClaim): PublicationStatement {
	publicationRunnerClaimSchema.parse(input);
	return {
		sql: `SELECT revision FROM publication_revision
WHERE revision = ?1 AND runner_id = ?2 AND target_id = ?3 AND renderer_source_id = ?4 AND status = 'publishing'
AND (next_visibility_boundary IS NULL OR next_visibility_boundary > ?5)
AND EXISTS (SELECT 1 FROM publication_state WHERE id = 'site' AND current_revision = ?1 AND recovery_required = 0
AND publication_state.approval_revision IS publication_revision.approval_revision)`,
		params: [input.revision, input.runnerId, input.targetId, input.rendererSourceId, input.now],
	};
}

/** A lost completion acknowledgement can require recovery even after a terminal receipt committed. */
export function markPublicationRecoveryStatement(input: PublicationClaim): PublicationStatement {
	publicationRunnerClaimSchema.parse(input);
	return {
		sql: `UPDATE publication_state SET recovery_required = 1, recovery_revision = ?1
WHERE id = 'site' AND EXISTS (SELECT 1 FROM publication_revision
WHERE revision = ?1 AND runner_id = ?2 AND target_id = ?3 AND renderer_source_id = ?4)`,
		params: [input.revision, input.runnerId, input.targetId, input.rendererSourceId],
	};
}

/** Run both statements in one D1 batch, only after external verification succeeds. */
export function completePublicationStatements(
	input: PublicationClaim & {
		artifactDigest: string;
		deploymentId: string;
		providerVersionId: string;
		artifactManifestJson: string;
	},
): [PublicationStatement, PublicationStatement] {
	publicationCompletionSchema.parse(input);
	const params = [
		input.revision,
		input.runnerId,
		input.targetId,
		input.rendererSourceId,
		input.now,
		input.artifactDigest,
		input.deploymentId,
		input.providerVersionId,
		input.artifactManifestJson,
	];
	return [
		{
			sql: `UPDATE publication_revision SET status = 'published', finished_at = ?5,
artifact_digest = ?6, deployment_id = ?7, provider_version_id = ?8, artifact_manifest_json = ?9, failure_code = NULL
WHERE revision = ?1 AND runner_id = ?2 AND target_id = ?3 AND renderer_source_id = ?4 AND status = 'publishing'
AND (next_visibility_boundary IS NULL OR next_visibility_boundary > ?5)
AND EXISTS (SELECT 1 FROM publication_state WHERE id = 'site' AND current_revision = ?1 AND recovery_required = 0
AND publication_state.approval_revision IS publication_revision.approval_revision)`,
			params,
		},
		{
			sql: `UPDATE publication_state SET last_good_revision = ?1
WHERE id = 'site' AND current_revision = ?1 AND recovery_required = 0
AND EXISTS (SELECT 1 FROM publication_revision WHERE revision = ?1 AND runner_id = ?2
AND target_id = ?3 AND renderer_source_id = ?4 AND status = 'published'
AND finished_at = ?5 AND artifact_digest = ?6 AND deployment_id = ?7 AND provider_version_id = ?8 AND artifact_manifest_json = ?9
AND publication_state.approval_revision IS publication_revision.approval_revision)`,
			params,
		},
	];
}

/** Sanitized failure codes only. A stale run may mark itself failed, never change last-good. */
export function failPublicationStatement(input: {
	revision: string;
	runnerId: string | null;
	code: PublicationFailureCode;
	now: number;
}): PublicationStatement {
	publicationFailureSchema.parse(input);
	return {
		sql: `UPDATE publication_revision SET status = 'failed', finished_at = ?4, failure_code = ?3
WHERE revision = ?1 AND runner_id IS ?2
AND ((status = 'draft' AND ?2 IS NULL) OR status = 'publishing')`,
		params: [input.revision, input.runnerId, input.code, input.now],
	};
}

export interface PublicationRecoveryIdentity {
	revision: string;
	targetId: string;
	publicOrigin: string;
}

function validateRecoveryIdentity(input: PublicationRecoveryIdentity) {
	publicationRunnerClaimSchema.pick({ revision: true, targetId: true }).parse({
		revision: input.revision,
		targetId: input.targetId,
	});
	const origin = new URL(input.publicOrigin);
	if (
		!["https:", "http:"].includes(origin.protocol) ||
		origin.origin !== input.publicOrigin ||
		origin.username ||
		origin.password
	)
		throw new Error("Recovery requires the exact configured public origin");
}

/** Explicit serialized operator action only; never changes a previous runner's ownership. */
export function acquirePublicationRecoveryStatement(
	input: PublicationRecoveryIdentity,
): PublicationStatement {
	validateRecoveryIdentity(input);
	return {
		sql: `UPDATE publication_state SET recovery_required = 1, recovery_revision = ?1
WHERE id = 'site' AND (current_revision = ?1 OR (current_revision IS NULL AND recovery_required = 1 AND recovery_revision = ?1))
AND EXISTS (SELECT 1 FROM publication_revision WHERE revision = ?1 AND target_id = ?2 AND public_origin = ?3)
AND (recovery_required = 0 OR recovery_revision IS NULL OR EXISTS (
SELECT 1 FROM publication_revision WHERE revision = publication_state.recovery_revision AND target_id = ?2 AND public_origin = ?3))
RETURNING current_revision, generation, last_good_revision, recovery_revision`,
		params: [input.revision, input.targetId, input.publicOrigin],
	};
}

export interface PublicationRecoveryFence extends PublicationRecoveryIdentity {
	currentRevision: string | null;
	generation: number;
	lastGoodRevision: string;
	runnerId: string | null;
	status: "draft" | "publishing" | "published" | "failed";
}

function recoveryFenceParams(input: PublicationRecoveryFence) {
	validateRecoveryIdentity(input);
	publicationRunnerClaimSchema.shape.revision.parse(input.lastGoodRevision);
	publicationRunnerClaimSchema.shape.runnerId.nullable().parse(input.runnerId);
	publicationRunnerClaimSchema.shape.revision.nullable().parse(input.currentRevision);
	if (
		(input.currentRevision !== null && input.currentRevision !== input.revision) ||
		!Number.isSafeInteger(input.generation) ||
		input.generation < 0 ||
		!["draft", "publishing", "published", "failed"].includes(input.status)
	)
		throw new Error("Invalid publication recovery fence");
	return [
		input.revision,
		input.targetId,
		input.publicOrigin,
		input.generation,
		input.lastGoodRevision,
		input.runnerId,
		input.status,
		input.currentRevision,
	];
}

/** Recheck the captured head and abandoned runner immediately before provider activation. */
export function currentPublicationRecoveryStatement(
	input: PublicationRecoveryFence,
): PublicationStatement {
	return {
		sql: `SELECT r.revision FROM publication_revision r CROSS JOIN publication_state s
WHERE s.id = 'site' AND r.revision = ?1 AND r.target_id = ?2 AND r.public_origin = ?3
AND s.generation = ?4 AND s.last_good_revision = ?5 AND s.recovery_required = 1 AND s.recovery_revision = ?1
AND r.runner_id IS ?6 AND r.status = ?7 AND s.current_revision IS ?8`,
		params: recoveryFenceParams(input),
	};
}

/** Atomic completion only after the immutable last-good version was restored and HTTP verified. */
export function completePublicationRecoveryStatements(
	input: PublicationRecoveryFence & { now: number },
): [PublicationStatement, PublicationStatement] {
	const params = recoveryFenceParams(input);
	publicationRunnerClaimSchema.shape.now.parse(input.now);
	params.push(input.now);
	return [
		{
			sql: `UPDATE publication_revision SET status = 'failed', failure_code = 'runner_failed', finished_at = ?9
WHERE revision = ?1 AND target_id = ?2 AND public_origin = ?3 AND runner_id IS ?6 AND status = ?7
AND status IN ('draft', 'publishing')
AND EXISTS (SELECT 1 FROM publication_state WHERE id = 'site' AND current_revision IS ?8
AND generation = ?4 AND last_good_revision = ?5 AND recovery_required = 1 AND recovery_revision = ?1)`,
			params,
		},
		{
			sql: `UPDATE publication_state SET recovery_required = 0, recovery_revision = NULL
WHERE id = 'site' AND current_revision IS ?8 AND generation = ?4 AND last_good_revision = ?5
AND recovery_required = 1 AND recovery_revision = ?1
AND EXISTS (SELECT 1 FROM publication_revision WHERE revision = ?1 AND target_id = ?2 AND public_origin = ?3
AND runner_id IS ?6 AND ((?7 IN ('draft', 'publishing') AND status = 'failed' AND failure_code = 'runner_failed' AND finished_at = ?9)
OR (?7 IN ('published', 'failed') AND status = ?7)))`,
			params,
		},
	];
}

/** An uncertain completion ACK must be re-fenced without overwriting a different recovery identity. */
export function relatchPublicationRecoveryStatement(
	input: PublicationRecoveryFence,
): PublicationStatement {
	const params = recoveryFenceParams(input);
	return {
		sql: `UPDATE publication_state SET recovery_required = 1, recovery_revision = ?1
WHERE id = 'site' AND current_revision IS ?8 AND generation = ?4 AND last_good_revision = ?5
AND (recovery_revision IS NULL OR recovery_revision = ?1)
AND EXISTS (SELECT 1 FROM publication_revision WHERE revision = ?1 AND target_id = ?2 AND public_origin = ?3 AND runner_id IS ?6)`,
		params,
	};
}

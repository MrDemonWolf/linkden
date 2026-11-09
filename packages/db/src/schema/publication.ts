import { sql } from "drizzle-orm";
import { check, index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

/** A frozen public source and its bounded operational result; never authoring secrets. */
export const publicationRevision = sqliteTable(
	"publication_revision",
	{
		revision: text("revision").primaryKey(),
		sourceDigest: text("source_digest").notNull(),
		targetId: text("target_id").notNull(),
		rendererSourceId: text("renderer_source_id").notNull(),
		publicOrigin: text("public_origin").notNull(),
		snapshotJson: text("snapshot_json").notNull(),
		/** Future approved content stays private and immutable; never returned to a runner/status. */
		approvedSourceJson: text("approved_source_json"),
		approvedSourceDigest: text("approved_source_digest"),
		approvalRevision: text("approval_revision"),
		requestKind: text("request_kind", { enum: ["manual", "scheduled"] })
			.notNull()
			.default("manual"),
		parentGeneration: integer("parent_generation"),
		nextVisibilityBoundary: integer("next_visibility_boundary", { mode: "timestamp_ms" }),
		status: text("status", { enum: ["draft", "publishing", "published", "failed"] })
			.notNull()
			.default("draft"),
		createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
		startedAt: integer("started_at", { mode: "timestamp_ms" }),
		finishedAt: integer("finished_at", { mode: "timestamp_ms" }),
		runnerId: text("runner_id"),
		artifactDigest: text("artifact_digest"),
		deploymentId: text("deployment_id"),
		providerVersionId: text("provider_version_id"),
		artifactManifestJson: text("artifact_manifest_json"),
		failureCode: text("failure_code"),
	},
	(table) => [
		index("publication_source_digest_idx").on(table.sourceDigest),
		check(
			"publication_status_valid",
			sql`${table.status} in ('draft','publishing','published','failed')`,
		),
		check(
			"publication_snapshot_bounded",
			sql`length(cast(${table.snapshotJson} as blob)) <= 1000000`,
		),
		check(
			"publication_manifest_bounded",
			sql`length(cast(${table.artifactManifestJson} as blob)) <= 262144`,
		),
	],
);

/** One site, with no FK cycle: factory reset can still empty every schema table. */
export const publicationState = sqliteTable(
	"publication_state",
	{
		id: text("id").primaryKey(),
		currentRevision: text("current_revision"),
		lastGoodRevision: text("last_good_revision"),
		generation: integer("generation").notNull().default(0),
		approvalRevision: text("approval_revision"),
		lastScheduleAttemptAt: integer("last_schedule_attempt_at", { mode: "timestamp_ms" }),
		scheduleFailureCode: text("schedule_failure_code"),
		lastRequestedAt: integer("last_requested_at", { mode: "timestamp_ms" }),
		nextVisibilityBoundary: integer("next_visibility_boundary", { mode: "timestamp_ms" }),
		requestDay: text("request_day").notNull(),
		requestsToday: integer("requests_today").notNull().default(0),
		recoveryRequired: integer("recovery_required", { mode: "boolean" }).notNull().default(false),
		recoveryRevision: text("recovery_revision"),
	},
	(table) => [check("publication_single_site", sql`${table.id} = 'site'`)],
);

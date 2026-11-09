CREATE TABLE `publication_revision` (
	`revision` text PRIMARY KEY NOT NULL,
	`source_digest` text NOT NULL,
	`target_id` text NOT NULL,
	`renderer_source_id` text NOT NULL,
	`public_origin` text NOT NULL,
	`snapshot_json` text NOT NULL,
	`next_visibility_boundary` integer,
	`status` text DEFAULT 'draft' NOT NULL,
	`created_at` integer NOT NULL,
	`started_at` integer,
	`finished_at` integer,
	`runner_id` text,
	`artifact_digest` text,
	`deployment_id` text,
	`provider_version_id` text,
	`artifact_manifest_json` text,
	`failure_code` text,
	CONSTRAINT "publication_status_valid" CHECK("publication_revision"."status" in ('draft','publishing','published','failed')),
	CONSTRAINT "publication_snapshot_bounded" CHECK(length(cast("publication_revision"."snapshot_json" as blob)) <= 1000000),
	CONSTRAINT "publication_manifest_bounded" CHECK(length(cast("publication_revision"."artifact_manifest_json" as blob)) <= 262144)
);
--> statement-breakpoint
CREATE INDEX `publication_source_digest_idx` ON `publication_revision` (`source_digest`);--> statement-breakpoint
CREATE TABLE `publication_state` (
	`id` text PRIMARY KEY NOT NULL,
	`current_revision` text,
	`last_good_revision` text,
	`generation` integer DEFAULT 0 NOT NULL,
	`last_requested_at` integer,
	`next_visibility_boundary` integer,
	`request_day` text NOT NULL,
	`requests_today` integer DEFAULT 0 NOT NULL,
	`recovery_required` integer DEFAULT false NOT NULL,
	`recovery_revision` text,
	CONSTRAINT "publication_single_site" CHECK("publication_state"."id" = 'site')
);

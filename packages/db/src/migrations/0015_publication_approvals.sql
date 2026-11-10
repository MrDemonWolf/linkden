ALTER TABLE `publication_revision` ADD `approved_source_json` text;--> statement-breakpoint
ALTER TABLE `publication_revision` ADD `approved_source_digest` text;--> statement-breakpoint
ALTER TABLE `publication_revision` ADD `approval_revision` text;--> statement-breakpoint
ALTER TABLE `publication_revision` ADD `request_kind` text DEFAULT 'manual' NOT NULL;--> statement-breakpoint
ALTER TABLE `publication_revision` ADD `parent_generation` integer;--> statement-breakpoint
ALTER TABLE `publication_state` ADD `approval_revision` text;--> statement-breakpoint
ALTER TABLE `publication_state` ADD `last_schedule_attempt_at` integer;--> statement-breakpoint
ALTER TABLE `publication_state` ADD `schedule_failure_code` text;
--> statement-breakpoint
DROP TRIGGER publication_request_guard;
--> statement-breakpoint
-- Request limits and head advancement are one atomic INSERT, including concurrent callers.
CREATE TRIGGER publication_request_guard
BEFORE INSERT ON publication_revision
BEGIN
  SELECT CASE WHEN NEW.status <> 'draft' OR NEW.runner_id IS NOT NULL
    OR NEW.started_at IS NOT NULL OR NEW.finished_at IS NOT NULL
    OR NEW.artifact_digest IS NOT NULL OR NEW.deployment_id IS NOT NULL
    OR NEW.provider_version_id IS NOT NULL OR NEW.artifact_manifest_json IS NOT NULL
    OR NEW.failure_code IS NOT NULL
    THEN RAISE(ABORT, 'publication_request_invalid') END;
  SELECT CASE WHEN (SELECT count(*) FROM publication_revision) >= 100
    THEN RAISE(ABORT, 'publication_revision_limit') END;
  INSERT INTO publication_state (id, request_day, requests_today, generation)
    VALUES ('site', strftime('%Y-%m-%d', NEW.created_at / 1000, 'unixepoch'), 0, 0)
    ON CONFLICT(id) DO NOTHING;
  SELECT CASE WHEN (SELECT recovery_required FROM publication_state WHERE id = 'site') <> 0
    THEN RAISE(ABORT, 'publication_recovery_required') END;
  SELECT CASE WHEN EXISTS (
    SELECT 1 FROM publication_state WHERE id = 'site' AND (
      last_requested_at > NEW.created_at - 60000
      OR request_day > strftime('%Y-%m-%d', NEW.created_at / 1000, 'unixepoch')
      OR (request_day = strftime('%Y-%m-%d', NEW.created_at / 1000, 'unixepoch') AND requests_today >= 20)
    )
  ) THEN RAISE(ABORT, 'publication_request_limit') END;
  SELECT CASE WHEN NEW.request_kind NOT IN ('manual', 'scheduled')
    OR (NEW.request_kind = 'manual' AND (
      NEW.parent_generation IS NOT NULL
      OR (NEW.approved_source_json IS NULL AND (NEW.approval_revision IS NOT NULL OR NEW.approved_source_digest IS NOT NULL))
      OR (NEW.approved_source_json IS NOT NULL AND (
        NEW.approval_revision IS NOT NEW.revision OR NEW.approved_source_digest IS NULL
        OR length(NEW.approved_source_digest) <> 64 OR NEW.approved_source_digest GLOB '*[^0-9a-f]*'
        OR length(cast(NEW.approved_source_json AS blob)) > 1000000 OR NOT json_valid(NEW.approved_source_json)
      ))
    ))
    OR (NEW.request_kind = 'scheduled' AND (
      NEW.approved_source_json IS NOT NULL OR NEW.approval_revision IS NULL OR NEW.parent_generation IS NULL
      OR NOT EXISTS (SELECT 1 FROM publication_state WHERE id = 'site'
        AND approval_revision = NEW.approval_revision AND generation = NEW.parent_generation
        AND next_visibility_boundary IS NOT NULL AND next_visibility_boundary <= NEW.created_at)
      OR EXISTS (SELECT 1 FROM publication_revision r INNER JOIN publication_state s ON s.current_revision = r.revision
        WHERE s.id = 'site' AND r.status = 'publishing')
      OR NOT EXISTS (SELECT 1 FROM publication_revision WHERE revision = NEW.approval_revision
        AND request_kind = 'manual' AND approved_source_json IS NOT NULL
        AND approved_source_digest = NEW.approved_source_digest
        AND target_id = NEW.target_id AND renderer_source_id = NEW.renderer_source_id AND public_origin = NEW.public_origin)
    ))
    THEN RAISE(ABORT, 'publication_approval_superseded') END;
  UPDATE publication_state SET
    current_revision = NEW.revision,
    generation = generation + 1,
    approval_revision = CASE WHEN NEW.request_kind = 'manual' THEN NEW.approval_revision ELSE approval_revision END,
    last_schedule_attempt_at = CASE WHEN NEW.request_kind = 'manual' THEN NULL ELSE last_schedule_attempt_at END,
    schedule_failure_code = NULL,
    last_requested_at = NEW.created_at,
    next_visibility_boundary = NEW.next_visibility_boundary,
    requests_today = CASE WHEN request_day = strftime('%Y-%m-%d', NEW.created_at / 1000, 'unixepoch')
      THEN requests_today + 1 ELSE 1 END,
    request_day = strftime('%Y-%m-%d', NEW.created_at / 1000, 'unixepoch')
  WHERE id = 'site';
END;

--> statement-breakpoint
DROP TRIGGER publication_source_immutable;
--> statement-breakpoint

-- A job always builds the exact frozen source that was reviewed and requested.
CREATE TRIGGER publication_source_immutable
BEFORE UPDATE ON publication_revision
WHEN NEW.revision IS NOT OLD.revision OR NEW.source_digest IS NOT OLD.source_digest
  OR NEW.target_id IS NOT OLD.target_id OR NEW.renderer_source_id IS NOT OLD.renderer_source_id
  OR NEW.public_origin IS NOT OLD.public_origin OR NEW.snapshot_json IS NOT OLD.snapshot_json
  OR NEW.approval_revision IS NOT OLD.approval_revision OR NEW.approved_source_json IS NOT OLD.approved_source_json
  OR NEW.approved_source_digest IS NOT OLD.approved_source_digest OR NEW.request_kind IS NOT OLD.request_kind
  OR NEW.parent_generation IS NOT OLD.parent_generation
  OR NEW.created_at IS NOT OLD.created_at OR NEW.next_visibility_boundary IS NOT OLD.next_visibility_boundary
BEGIN
  SELECT RAISE(ABORT, 'publication_source_immutable');
END;


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
  UPDATE publication_state SET
    current_revision = NEW.revision,
    generation = generation + 1,
    last_requested_at = NEW.created_at,
    next_visibility_boundary = NEW.next_visibility_boundary,
    requests_today = CASE WHEN request_day = strftime('%Y-%m-%d', NEW.created_at / 1000, 'unixepoch')
      THEN requests_today + 1 ELSE 1 END,
    request_day = strftime('%Y-%m-%d', NEW.created_at / 1000, 'unixepoch')
  WHERE id = 'site';
END;
--> statement-breakpoint
-- A job always builds the exact frozen source that was reviewed and requested.
CREATE TRIGGER publication_source_immutable
BEFORE UPDATE ON publication_revision
WHEN NEW.revision IS NOT OLD.revision OR NEW.source_digest IS NOT OLD.source_digest
  OR NEW.target_id IS NOT OLD.target_id OR NEW.renderer_source_id IS NOT OLD.renderer_source_id
  OR NEW.public_origin IS NOT OLD.public_origin OR NEW.snapshot_json IS NOT OLD.snapshot_json
  OR NEW.created_at IS NOT OLD.created_at OR NEW.next_visibility_boundary IS NOT OLD.next_visibility_boundary
BEGIN
  SELECT RAISE(ABORT, 'publication_source_immutable');
END;
--> statement-breakpoint
CREATE TRIGGER publication_transition_guard
BEFORE UPDATE ON publication_revision
WHEN (OLD.runner_id IS NOT NULL AND NEW.runner_id IS NOT OLD.runner_id)
  OR (NEW.status <> OLD.status AND NOT (
    (OLD.status = 'draft' AND NEW.status IN ('publishing', 'failed'))
    OR (OLD.status = 'publishing' AND NEW.status IN ('published', 'failed'))
  ))
  OR (NEW.status = 'published' AND (
    NEW.runner_id IS NULL OR NEW.artifact_digest IS NULL OR NEW.deployment_id IS NULL
    OR NEW.provider_version_id IS NULL OR NEW.artifact_manifest_json IS NULL OR NEW.finished_at IS NULL
  ))
BEGIN
  SELECT RAISE(ABORT, 'publication_transition_invalid');
END;
--> statement-breakpoint
-- An ambiguous activation is site-wide, even when a newer request has been queued.
CREATE TRIGGER publication_recovery_guard
AFTER UPDATE OF failure_code ON publication_revision
WHEN NEW.failure_code = 'recovery_required'
BEGIN
  UPDATE publication_state SET recovery_required = 1, recovery_revision = NEW.revision WHERE id = 'site';
END;

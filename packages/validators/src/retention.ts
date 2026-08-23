// ─── Retention policy ───────────────────────────────────────────────────────
// The windows the daily retention cron enforces. They live here, not in
// @linkden/db, because the admin UI quotes them to the operator and pulling the
// database package into the browser bundle to read three numbers is not worth
// it. `@linkden/db/retention` re-exports these, so the cron and the copy that
// describes it can never drift again.

export interface RetentionPolicy {
	/** Days to keep page views and link clicks. */
	analyticsDays: number;
	/** Days to keep contact-form submissions. */
	contactsDays: number;
	/** Days to keep audit-log entries. */
	auditDays: number;
}

export const DEFAULT_RETENTION: RetentionPolicy = {
	analyticsDays: 365,
	contactsDays: 365,
	auditDays: 180,
};

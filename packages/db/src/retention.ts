import { DEFAULT_RETENTION, type RetentionPolicy } from "@linkden/validators/retention";
import { lt } from "drizzle-orm";
import type { BatchItem } from "drizzle-orm/batch";
import type { BaseSQLiteDatabase } from "drizzle-orm/sqlite-core";
import { auditLog, contactSubmission, linkClick, pageView, session } from "./schema";

const DAY_MS = 24 * 60 * 60 * 1000;

// Defined in @linkden/validators so the admin UI can quote the same numbers
// without importing the database package.
export { DEFAULT_RETENTION, type RetentionPolicy };

// Structural type covering both the D1 (production) and libsql (test) drivers,
// regardless of the schema generic they were created with.
// biome-ignore lint/suspicious/noExplicitAny: driver-agnostic db handle
type AnySqliteDb = BaseSQLiteDatabase<"async", any, any>;

/**
 * Build the retention delete statements: prune analytics, contact submissions,
 * and audit logs past their windows, plus any expired sessions. Returned as a
 * batch so the sweep is atomic.
 */
export function retentionDeletes(
	db: AnySqliteDb,
	now: Date,
	policy: RetentionPolicy = DEFAULT_RETENTION,
): BatchItem<"sqlite">[] {
	const analyticsCut = new Date(now.getTime() - policy.analyticsDays * DAY_MS);
	const contactsCut = new Date(now.getTime() - policy.contactsDays * DAY_MS);
	const auditCut = new Date(now.getTime() - policy.auditDays * DAY_MS);

	return [
		db.delete(pageView).where(lt(pageView.createdAt, analyticsCut)),
		db.delete(linkClick).where(lt(linkClick.createdAt, analyticsCut)),
		db.delete(contactSubmission).where(lt(contactSubmission.createdAt, contactsCut)),
		db.delete(session).where(lt(session.expiresAt, now)),
		db.delete(auditLog).where(lt(auditLog.createdAt, auditCut)),
	] as unknown as BatchItem<"sqlite">[];
}

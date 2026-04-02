import { db } from "@linkden/db";
import { auditLog } from "@linkden/db/schema/index";

/**
 * Write an entry to the audit log table.
 * Failures are swallowed so that a logging error never breaks the calling operation.
 *
 * @param action - The action being logged (e.g. "settings.update", "backup.export")
 * @param resourceType - Optional category of the affected resource (e.g. "setting", "contact")
 * @param resourceId - Optional identifier of the specific resource
 * @param details - Optional structured metadata to store alongside the log entry
 */
export async function logAudit(
	action: string,
	resourceType?: string,
	resourceId?: string,
	details?: Record<string, unknown>,
): Promise<void> {
	try {
		await db.insert(auditLog).values({
			id: crypto.randomUUID(),
			action,
			resourceType: resourceType ?? null,
			resourceId: resourceId ?? null,
			details: details ? JSON.stringify(details) : null,
		});
	} catch {
		// Audit logging failures must not break the primary operation
		console.warn("[audit] Failed to write audit log for action:", action);
	}
}

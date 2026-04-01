import { db } from "@linkden/db";
import { auditLog } from "@linkden/db/schema/index";

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

import { sqliteTable, text, integer, index } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

export const auditLog = sqliteTable(
	"audit_log",
	{
		id: text("id").primaryKey(),
		action: text("action").notNull(),
		resourceType: text("resource_type"),
		resourceId: text("resource_id"),
		details: text("details"), // JSON string
		createdAt: integer("created_at", { mode: "timestamp_ms" })
			.default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
			.notNull(),
	},
	(table) => [
		index("audit_log_created_at_idx").on(table.createdAt),
		index("audit_log_action_idx").on(table.action),
	],
);

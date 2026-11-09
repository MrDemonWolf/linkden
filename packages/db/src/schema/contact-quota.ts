import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

// One site-wide row, not per-visitor data or an unbounded daily event log.
export const contactQuota = sqliteTable("contact_quota", {
	id: text("id").primaryKey(),
	day: text("day").notNull(),
	reserved: integer("reserved").notNull(),
});

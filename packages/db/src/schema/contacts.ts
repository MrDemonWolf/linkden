import { sql } from "drizzle-orm";
import { sqliteTable, text, integer, index } from "drizzle-orm/sqlite-core";

export const contactSubmission = sqliteTable(
  "contact_submission",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    email: text("email").notNull(),
    message: text("message").notNull(),
    phone: text("phone"),
    subject: text("subject"),
    company: text("company"),
    whereMet: text("where_met"),
    rating: integer("rating"),
    attending: text("attending"),
    guests: integer("guests"),
    isRead: integer("is_read", { mode: "boolean" }).default(false).notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    index("contact_submission_isRead_idx").on(table.isRead),
    index("contact_submission_createdAt_idx").on(table.createdAt),
  ],
);

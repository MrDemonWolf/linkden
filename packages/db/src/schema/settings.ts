import { sql } from "drizzle-orm";
import { sqliteTable, text, integer, index } from "drizzle-orm/sqlite-core";

export const siteSettings = sqliteTable("site_settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
});

export const socialNetwork = sqliteTable(
  "social_network",
  {
    slug: text("slug").primaryKey(),
    url: text("url").notNull(),
    isActive: integer("is_active", { mode: "boolean" }).default(true).notNull(),
    addedAt: integer("added_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
  },
  (table) => [index("social_network_isActive_idx").on(table.isActive)],
);

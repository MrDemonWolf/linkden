import { sql } from "drizzle-orm";
import { sqliteTable, text, integer, index } from "drizzle-orm/sqlite-core";

export const block = sqliteTable(
  "block",
  {
    id: text("id").primaryKey(),
    type: text("type", {
      enum: ["link", "header", "social_icons", "embed", "form"],
    }).notNull(),
    title: text("title"),
    url: text("url"),
    icon: text("icon"),
    embedType: text("embed_type"),
    embedUrl: text("embed_url"),
    socialIcons: text("social_icons"),
    isEnabled: integer("is_enabled", { mode: "boolean" }).default(true).notNull(),
    position: integer("position").notNull(),
    scheduledStart: integer("scheduled_start", { mode: "timestamp_ms" }),
    scheduledEnd: integer("scheduled_end", { mode: "timestamp_ms" }),
    status: text("status", { enum: ["published", "draft"] }).notNull().default("published"),
    config: text("config"),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    index("block_type_idx").on(table.type),
    index("block_position_idx").on(table.position),
    index("block_status_idx").on(table.status),
  ],
);

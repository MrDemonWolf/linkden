import { relations, sql } from "drizzle-orm";
import { sqliteTable, text, integer, index } from "drizzle-orm/sqlite-core";
import { block } from "./blocks";

export const pageView = sqliteTable(
  "page_view",
  {
    id: text("id").primaryKey(),
    referrer: text("referrer"),
    userAgent: text("user_agent"),
    country: text("country"),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
  },
  (table) => [
    index("page_view_createdAt_idx").on(table.createdAt),
    index("page_view_country_idx").on(table.country),
  ],
);

export const linkClick = sqliteTable(
  "link_click",
  {
    id: text("id").primaryKey(),
    blockId: text("block_id")
      .notNull()
      .references(() => block.id, { onDelete: "cascade" }),
    referrer: text("referrer"),
    userAgent: text("user_agent"),
    country: text("country"),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
  },
  (table) => [
    index("link_click_blockId_idx").on(table.blockId),
    index("link_click_createdAt_idx").on(table.createdAt),
    index("link_click_country_idx").on(table.country),
  ],
);

export const blockRelations = relations(block, ({ many }) => ({
  clicks: many(linkClick),
}));

export const linkClickRelations = relations(linkClick, ({ one }) => ({
  block: one(block, {
    fields: [linkClick.blockId],
    references: [block.id],
  }),
}));

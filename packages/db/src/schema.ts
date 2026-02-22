import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const linkTypeEnum = [
  "link",
  "heading",
  "spacer",
  "text",
  "email",
  "phone",
  "vcard",
  "wallet",
] as const;

export type LinkType = (typeof linkTypeEnum)[number];

export const iconTypeEnum = ["brand", "lucide", "custom"] as const;
export type IconType = (typeof iconTypeEnum)[number];

export const links = sqliteTable(
  "links",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    type: text("type", { enum: linkTypeEnum }).notNull().default("link"),
    title: text("title").notNull().default(""),
    url: text("url").default(""),
    icon: text("icon").default(""),
    iconType: text("icon_type", { enum: iconTypeEnum }).default("brand"),
    isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
    sortOrder: integer("sort_order").notNull().default(0),
    clickCount: integer("click_count").notNull().default(0),
    metadata: text("metadata", { mode: "json" }).$type<Record<string, unknown>>(),
    createdAt: text("created_at")
      .notNull()
      .$defaultFn(() => new Date().toISOString()),
    updatedAt: text("updated_at")
      .notNull()
      .$defaultFn(() => new Date().toISOString()),
  },
  (table) => [index("links_sort_order_idx").on(table.sortOrder)],
);

export const settings = sqliteTable("settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull().default(""),
  updatedAt: text("updated_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
});

export const analytics = sqliteTable(
  "analytics",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    linkId: text("link_id").references(() => links.id, { onDelete: "set null" }),
    event: text("event").notNull(),
    referrer: text("referrer").default(""),
    userAgent: text("user_agent").default(""),
    country: text("country").default(""),
    createdAt: text("created_at")
      .notNull()
      .$defaultFn(() => new Date().toISOString()),
  },
  (table) => [
    index("analytics_created_at_idx").on(table.createdAt),
    index("analytics_event_idx").on(table.event),
    index("analytics_link_id_idx").on(table.linkId),
  ],
);

export const walletPass = sqliteTable("wallet_pass", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  passTypeId: text("pass_type_id").default(""),
  teamId: text("team_id").default(""),
  organizationName: text("organization_name").default(""),
  description: text("description").default(""),
  logoText: text("logo_text").default(""),
  headerFields: text("header_fields", { mode: "json" }).$type<
    Array<{ key: string; label: string; value: string }>
  >(),
  primaryFields: text("primary_fields", { mode: "json" }).$type<
    Array<{ key: string; label: string; value: string }>
  >(),
  secondaryFields: text("secondary_fields", { mode: "json" }).$type<
    Array<{ key: string; label: string; value: string }>
  >(),
  auxiliaryFields: text("auxiliary_fields", { mode: "json" }).$type<
    Array<{ key: string; label: string; value: string }>
  >(),
  backFields: text("back_fields", { mode: "json" }).$type<
    Array<{ key: string; label: string; value: string }>
  >(),
  barcodeFormat: text("barcode_format").default("PKBarcodeFormatQR"),
  barcodeMessage: text("barcode_message").default(""),
  barcodeAltText: text("barcode_alt_text").default(""),
  backgroundColor: text("background_color").default("rgb(255,255,255)"),
  foregroundColor: text("foreground_color").default("rgb(0,0,0)"),
  labelColor: text("label_color").default("rgb(100,100,100)"),
  logoUrl: text("logo_url").default(""),
  iconUrl: text("icon_url").default(""),
  stripUrl: text("strip_url").default(""),
  thumbnailUrl: text("thumbnail_url").default(""),
  createdAt: text("created_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
  updatedAt: text("updated_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
});

export const vcard = sqliteTable("vcard", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  firstName: text("first_name").default(""),
  lastName: text("last_name").default(""),
  prefix: text("prefix").default(""),
  suffix: text("suffix").default(""),
  nickname: text("nickname").default(""),
  birthday: text("birthday").default(""),
  photo: text("photo").default(""),
  organization: text("organization").default(""),
  title: text("title").default(""),
  role: text("role").default(""),
  department: text("department").default(""),
  email: text("email").default(""),
  emailWork: text("email_work").default(""),
  phone: text("phone").default(""),
  phoneWork: text("phone_work").default(""),
  phoneMobile: text("phone_mobile").default(""),
  fax: text("fax").default(""),
  addressStreet: text("address_street").default(""),
  addressCity: text("address_city").default(""),
  addressState: text("address_state").default(""),
  addressZip: text("address_zip").default(""),
  addressCountry: text("address_country").default(""),
  addressWorkStreet: text("address_work_street").default(""),
  addressWorkCity: text("address_work_city").default(""),
  addressWorkState: text("address_work_state").default(""),
  addressWorkZip: text("address_work_zip").default(""),
  addressWorkCountry: text("address_work_country").default(""),
  website: text("website").default(""),
  websiteWork: text("website_work").default(""),
  socialTwitter: text("social_twitter").default(""),
  socialLinkedin: text("social_linkedin").default(""),
  socialGithub: text("social_github").default(""),
  socialInstagram: text("social_instagram").default(""),
  socialFacebook: text("social_facebook").default(""),
  socialYoutube: text("social_youtube").default(""),
  notes: text("notes").default(""),
  createdAt: text("created_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
  updatedAt: text("updated_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
});

export const contactSubmissions = sqliteTable(
  "contact_submissions",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    name: text("name").notNull(),
    email: text("email").notNull(),
    message: text("message").notNull(),
    isRead: integer("is_read", { mode: "boolean" }).notNull().default(false),
    createdAt: text("created_at")
      .notNull()
      .$defaultFn(() => new Date().toISOString()),
  },
  (table) => [index("contact_submissions_created_at_idx").on(table.createdAt)],
);

export const pages = sqliteTable("pages", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  slug: text("slug").notNull().unique(),
  title: text("title").notNull(),
  content: text("content").notNull().default(""),
  isPublished: integer("is_published", { mode: "boolean" }).notNull().default(false),
  createdAt: text("created_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
  updatedAt: text("updated_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
});

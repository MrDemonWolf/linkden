import { z } from "zod";
import { EMBED_PROVIDER_MAP, validateEmbedUrl } from "./embed";
import { blankable, httpUrlSchema } from "./primitives";
import { vcardDataSchema } from "./vcard";

export { httpUrlSchema };

// ─── Block schemas ───────────────────────────────────────────────────────────
// Single source of truth for block shapes, shared by the tRPC router (server
// validation) and the admin builder (inline errors). Every string is bounded,
// every URL must be http(s), and unknown config keys are stripped on parse.

export const blockTypeSchema = z.enum([
	"link",
	"header",
	"embed",
	"connect",
	"vcard",
	"location",
	"image",
	"text",
	"divider",
]);

export type BlockType = z.infer<typeof blockTypeSchema>;

export const hexColorSchema = z.string().regex(/^#[0-9a-fA-F]{6}$/, "Expected a 6-digit hex color");
export const embedTypeSchema = z.enum(["youtube", "spotify", "soundcloud", "custom"]);
export type EmbedType = z.infer<typeof embedTypeSchema>;

const textAlignSchema = z.enum(["left", "center", "right"]);
const sideSchema = z.enum(["left", "right"]);
const emojiSchema = z.string().max(16);
/**
 * Like `blankable`, but "" parses to `null` so the router's `.set()` actually
 * clears the column instead of storing an empty string (or, with undefined,
 * leaving the old value in place).
 */
const clearable = <T extends z.ZodType>(schema: T) =>
	blankable(schema).transform((v) => (v === "" ? null : v));

// Per-block style overrides the admin Style section writes for link/connect/vcard.
const styleSchema = z.object({
	customBgColor: blankable(hexColorSchema),
	customTextColor: blankable(hexColorSchema),
	customBorderColor: blankable(hexColorSchema),
	borderRadius: z.enum(["none", "sm", "md", "lg", "xl", "2xl", "full"]).optional(),
	shadow: z.enum(["none", "sm", "md", "lg"]).optional(),
});

export const linkConfigSchema = styleSchema.extend({
	variant: z.enum(["classic", "thumbnail", "featured"]).optional(),
	thumbnail: blankable(httpUrlSchema),
	description: z.string().max(200).optional(),
	emoji: emojiSchema.optional(),
	emojiPosition: sideSchema.optional(),
	textAlign: textAlignSchema.optional(),
	isHighlighted: z.boolean().optional(),
	isOutlined: z.boolean().optional(),
	newTab: z.boolean().optional(),
	noFollow: z.boolean().optional(),
});

export const headerConfigSchema = z.object({
	headingLevel: z.enum(["h1", "h2", "h3", "h4", "h5", "h6"]).optional(),
	textAlign: textAlignSchema.optional(),
	emoji: emojiSchema.optional(),
	emojiPosition: sideSchema.optional(),
	showDivider: z.boolean().optional(),
	/** Layout for the blocks that follow this header, up to the next header. */
	layout: z.enum(["list", "grid", "carousel"]).optional(),
});

export const embedConfigSchema = z.object({
	aspectRatio: z.enum(["16:9", "4:3", "1:1"]).optional(),
	maxWidth: z.enum(["sm", "md", "lg", "full"]).optional(),
	showTitle: z.boolean().optional(),
});

export const whereMetOptions = [
	"Conference",
	"Online",
	"Work",
	"Mutual Friend",
	"Social Media",
	"Other",
] as const;

export const connectConfigSchema = styleSchema.extend({
	preset: z.enum(["contact", "connect", "feedback", "rsvp"]).optional(),
	displayMode: z.enum(["inline", "modal"]).optional(),
	buttonText: z.string().max(80).optional(),
	buttonEmoji: emojiSchema.optional(),
	buttonEmojiPosition: sideSchema.optional(),
	successMessage: z.string().max(200).optional(),
	isOutlined: z.boolean().optional(),
	textAlign: textAlignSchema.optional(),
	showPhone: z.boolean().optional(),
	showSubject: z.boolean().optional(),
	showCompany: z.boolean().optional(),
	showWhereMet: z.boolean().optional(),
	showRating: z.boolean().optional(),
	showAttending: z.boolean().optional(),
	showGuests: z.boolean().optional(),
});

// Derived from vcardDataSchema so the block editor / blocks router (write) and
// GET /api/vcard (read, which parses the stored block config with
// vcardDataSchema) enforce identical bounds. A block that saves must download.
export const vcardConfigSchema = styleSchema.extend(vcardDataSchema.shape).extend({
	buttonText: z.string().max(80).optional(),
	buttonEmoji: emojiSchema.optional(),
	buttonEmojiPosition: sideSchema.optional(),
	isOutlined: z.boolean().optional(),
});

export const locationConfigSchema = z.object({
	address: z.string().max(300).optional(),
	linkType: z.enum(["google", "apple", "custom", "none"]).optional(),
	customLinkUrl: blankable(httpUrlSchema),
	coordinates: z
		.object({ lat: z.number().min(-90).max(90), lng: z.number().min(-180).max(180) })
		.optional(),
});

export const imageConfigSchema = z.object({
	/** Blank until the user uploads — renderers skip the block when empty. */
	src: blankable(httpUrlSchema),
	alt: z.string().max(200).optional(),
	caption: z.string().max(200).optional(),
	aspect: z.enum(["auto", "16:9", "1:1", "4:5"]).optional(),
});

export const textConfigSchema = z.object({
	body: z.string().max(2000),
	textAlign: textAlignSchema.optional(),
});

export const dividerConfigSchema = z.object({
	style: z.enum(["line", "space", "dots"]).optional(),
	size: z.enum(["sm", "md", "lg"]).optional(),
});

export type LinkConfig = z.infer<typeof linkConfigSchema>;
export type HeaderConfig = z.infer<typeof headerConfigSchema>;
export type EmbedConfig = z.infer<typeof embedConfigSchema>;
export type ConnectConfig = z.infer<typeof connectConfigSchema>;
export type VcardConfig = z.infer<typeof vcardConfigSchema>;
export type LocationConfig = z.infer<typeof locationConfigSchema>;
export type ImageConfig = z.infer<typeof imageConfigSchema>;
export type TextConfig = z.infer<typeof textConfigSchema>;
export type DividerConfig = z.infer<typeof dividerConfigSchema>;

const CONFIG_SCHEMAS = {
	link: linkConfigSchema,
	header: headerConfigSchema,
	embed: embedConfigSchema,
	connect: connectConfigSchema,
	vcard: vcardConfigSchema,
	location: locationConfigSchema,
	image: imageConfigSchema,
	text: textConfigSchema,
	divider: dividerConfigSchema,
} as const;

export function blockConfigSchemaFor<T extends BlockType>(type: T): (typeof CONFIG_SCHEMAS)[T] {
	return CONFIG_SCHEMAS[type];
}

/** Own-key lookup so a stored type like "constructor" can't hit Object.prototype. */
function configSchemaOrNull(type: string) {
	return Object.hasOwn(CONFIG_SCHEMAS, type) ? CONFIG_SCHEMAS[type as BlockType] : null;
}

export type ParseBlockConfigResult<T extends BlockType = BlockType> =
	| { ok: true; data: z.infer<(typeof CONFIG_SCHEMAS)[T]> }
	| { ok: false; issues: string[] };

/** Parse a stored/incoming config JSON string against the schema for `type`. */
export function parseBlockConfig<T extends BlockType>(
	type: T,
	json: string | null | undefined,
): ParseBlockConfigResult<T> {
	let raw: unknown = {};
	if (json?.trim()) {
		try {
			raw = JSON.parse(json);
		} catch {
			return { ok: false, issues: ["config: invalid JSON"] };
		}
	}
	// A row can still carry a retired type (e.g. `form`) that no schema covers:
	// report it as an issue (→ 400) instead of dereferencing undefined (→ 500).
	const schema = configSchemaOrNull(type);
	if (!schema) return { ok: false, issues: ["type: unsupported block type"] };
	const result = schema.safeParse(raw);
	if (result.success) return { ok: true, data: result.data as z.infer<(typeof CONFIG_SCHEMAS)[T]> };
	return {
		ok: false,
		issues: result.error.issues.map((i) => `config.${i.path.join(".") || "(root)"}: ${i.message}`),
	};
}

export const MAX_BLOCK_CONFIG_LENGTH = 50_000;

// ISO string over the wire (no tRPC transformer), Date when called in-process.
const scheduleDateSchema = z
	.union([z.iso.datetime({ offset: true }), z.date()])
	.transform((v) => new Date(v));

const blockFieldsSchema = z.object({
	id: z.string().min(1).max(64),
	type: blockTypeSchema,
	title: z.string().max(200).optional(),
	url: clearable(httpUrlSchema),
	icon: clearable(
		z
			.string()
			.max(80)
			.regex(/^(lucide:|brand:)?[a-z0-9-]+$/i, "Expected lucide:<name> or brand:<slug>"),
	),
	embedType: clearable(embedTypeSchema),
	embedUrl: clearable(httpUrlSchema),
	isEnabled: z.boolean().optional(),
	position: z.number().int().min(0),
	scheduledStart: scheduleDateSchema.nullable().optional(),
	scheduledEnd: scheduleDateSchema.nullable().optional(),
	config: z.string().max(MAX_BLOCK_CONFIG_LENGTH).optional(),
});

type BlockRefineInput = {
	type?: BlockType;
	config?: string;
	embedType?: string | null;
	embedUrl?: string | null;
	scheduledStart?: Date | null;
	scheduledEnd?: Date | null;
};

function refineBlock(val: BlockRefineInput, ctx: z.RefinementCtx) {
	// Only when both are in the payload (updates are partial; the editor always
	// sends both). Backup import stays permissive and doesn't use this.
	if (val.embedType && val.embedUrl && !validateEmbedUrl(val.embedType, val.embedUrl)) {
		const label = EMBED_PROVIDER_MAP[val.embedType]?.label ?? val.embedType;
		ctx.addIssue({
			code: "custom",
			path: ["embedUrl"],
			message: `This doesn't look like a ${label} URL`,
		});
	}
	if (val.type && val.config !== undefined) {
		const parsed = parseBlockConfig(val.type, val.config);
		if (!parsed.ok) {
			for (const issue of parsed.issues) {
				ctx.addIssue({ code: "custom", path: ["config"], message: issue });
			}
		}
	}
	if (val.scheduledStart && val.scheduledEnd && val.scheduledStart >= val.scheduledEnd) {
		ctx.addIssue({
			code: "custom",
			path: ["scheduledEnd"],
			message: "Schedule end must be after schedule start",
		});
	}
}

export const blockStatusSchema = z.enum(["published", "draft"]);

// `status` is create-only: it exists so an Undo after delete can put the row
// back exactly as it was (a deleted live block must not return unpublished).
// It is deliberately absent from updateBlockSchema — editing never changes
// publication state.
export const createBlockSchema = blockFieldsSchema
	.extend({ status: blockStatusSchema.optional() })
	.superRefine(refineBlock);

export const updateBlockSchema = blockFieldsSchema
	.partial()
	.required({ id: true })
	.superRefine(refineBlock);

/**
 * Hard cap on blocks per page. One number for every path that can add or
 * reorder blocks (blocks.create, reorder, backup and LinkStack import) so an
 * import can never create a page the builder can no longer reorder.
 */
export const MAX_BLOCKS = 500;

export const reorderBlocksSchema = z
	.array(z.object({ id: z.string().min(1).max(64), position: z.number().int().min(0) }))
	.max(MAX_BLOCKS);

export type CreateBlockInput = z.input<typeof createBlockSchema>;
export type UpdateBlockInput = z.input<typeof updateBlockSchema>;

// ─── Embed providers ────────────────────────────────────────────────────────
// Live in ./embed (zod-free, so the public embed block can import them without
// pulling zod into the page bundle); re-exported for the router and builder.
export {
	EMBED_PROVIDER_MAP,
	EMBED_PROVIDERS,
	type EmbedProvider,
	getEmbedSrc,
	validateEmbedUrl,
} from "./embed";

// ─── Contact form ───────────────────────────────────────────────────────────
// public.submitContact's input. The public form (apps/web lib/contact-form.ts,
// zod-free) mirrors these limits; a test pins them together.
export const CONTACT_FIELD_LIMITS = {
	firstName: 50,
	lastName: 50,
	email: 254,
	whereMet: 200,
	message: 5000,
	captchaToken: 4096,
	website: 200,
	blockId: 100,
	blockTitle: 200,
} as const;

export const contactSubmissionSchema = z.object({
	firstName: z.string().min(1).max(CONTACT_FIELD_LIMITS.firstName),
	lastName: z.string().min(1).max(CONTACT_FIELD_LIMITS.lastName),
	email: z.string().email().max(CONTACT_FIELD_LIMITS.email),
	whereMet: z.string().max(CONTACT_FIELD_LIMITS.whereMet).optional(),
	message: z.string().max(CONTACT_FIELD_LIMITS.message).optional(),
	captchaToken: z.string().max(CONTACT_FIELD_LIMITS.captchaToken).optional(),
	/** Honeypot: rendered hidden, so only bots fill it in. */
	website: z.string().max(CONTACT_FIELD_LIMITS.website).optional(),
	blockId: z.string().max(CONTACT_FIELD_LIMITS.blockId).optional(),
	blockTitle: z.string().max(CONTACT_FIELD_LIMITS.blockTitle).optional(),
	consent: z.literal(true, { error: "Consent is required" }),
});

export type ContactSubmissionInput = z.infer<typeof contactSubmissionSchema>;

// ─── Backup/Import schemas ─────────────────────────────────────────────────
// These mirror DB columns so backup imports are validated against the actual schema
// rather than using z.any(). Shared here to prevent drift between backup.ts and blocks.ts.

/**
 * A timestamp as backup.export actually emits it. There is no tRPC
 * transformer, so a Drizzle `timestamp_ms` column (a Date) reaches the file as
 * an ISO string; epoch ms (hand-edited / older backups) and a Date (in-process
 * callers) are accepted too. Always yields a valid Date — never a bare number,
 * which Drizzle's timestamp column can't write.
 */
export const importDateSchema = z
	.union([z.iso.datetime({ offset: true }), z.number().int().nonnegative(), z.date()])
	.transform((v) => new Date(v))
	.refine((d) => !Number.isNaN(d.getTime()), "Invalid date");

/** Max contact messages one restore writes (newest first; the rest are counted as skipped). */
export const MAX_IMPORT_CONTACTS = 500;
/** Wire cap for contact messages in a backup file — export is unbounded, so accept more than we write. */
export const MAX_BACKUP_CONTACTS = 5_000;

/**
 * Block types retired without a data migration. Old rows / backups map onto
 * their replacement; `null` means the type has no successor (social icons now
 * live in social_network) and the row is dropped.
 */
const LEGACY_BLOCK_TYPES = new Map<string, BlockType | null>([
	["form", "connect"],
	["contact_form", "connect"],
	["social_icons", null],
]);

/** Resolve a stored/imported type string to a current BlockType, or null when unsupported. */
export function normalizeBlockType(type: string): BlockType | null {
	if (LEGACY_BLOCK_TYPES.has(type)) return LEGACY_BLOCK_TYPES.get(type) ?? null;
	const parsed = blockTypeSchema.safeParse(type);
	return parsed.success ? parsed.data : null;
}

export const blockImportSchema = z.object({
	id: z.string(),
	// Loose on purpose: a retired or unknown type skips one row in
	// validateBlockImport instead of failing the whole restore.
	type: z.string().max(40),
	title: z.string().nullable().optional(),
	url: z.string().nullable().optional(),
	icon: z.string().nullable().optional(),
	embedType: z.string().nullable().optional(),
	embedUrl: z.string().nullable().optional(),
	// `socialIcons` (a dead column) is deliberately absent: zod strips it, so a
	// backup can't plant an unbounded blob that every public page load returns.
	isEnabled: z.boolean().optional().default(true),
	position: z.number(),
	scheduledStart: importDateSchema.nullable().optional(),
	scheduledEnd: importDateSchema.nullable().optional(),
	status: blockStatusSchema.optional().default("published"),
	config: z.string().nullable().optional(),
	createdAt: importDateSchema.nullable().optional(),
	updatedAt: importDateSchema.nullable().optional(),
});

export type BlockImport = z.infer<typeof blockImportSchema>;

/** A backup row that passed validateBlockImport, normalized for insertion. */
export interface ValidBlockImport {
	id: string;
	type: BlockType;
	title: string | null;
	url: string | null;
	icon: string | null;
	embedType: EmbedType | null;
	embedUrl: string | null;
	isEnabled: boolean;
	position: number;
	status: z.infer<typeof blockStatusSchema>;
	config: string | null;
	scheduledStart: Date | null;
	scheduledEnd: Date | null;
	/** Omitted (not null) when the backup has none, so the column default applies. */
	createdAt?: Date;
	updatedAt?: Date;
}

/**
 * Re-check one backup row against the rules blocks.create enforces (http(s)
 * URLs, icon format, bounded title, per-type config, schedule order). The wire
 * schema above stays loose so one bad row can't fail the whole restore; the
 * importer skips (and counts) rows this rejects, the same way settings are
 * handled. Returns a value built only from the parsed fields — never the raw
 * row — so no unvalidated field reaches the database.
 */
export function validateBlockImport(row: BlockImport): ValidBlockImport | null {
	const type = normalizeBlockType(row.type);
	if (!type) return null;
	const result = createBlockSchema.safeParse({
		id: row.id,
		type,
		title: row.title ?? undefined,
		url: row.url ?? undefined,
		icon: row.icon ?? undefined,
		embedType: row.embedType ?? undefined,
		embedUrl: row.embedUrl ?? undefined,
		position: row.position,
		config: row.config ?? undefined,
		scheduledStart: row.scheduledStart ?? null,
		scheduledEnd: row.scheduledEnd ?? null,
	});
	if (!result.success) return null;
	const d = result.data;
	return {
		id: d.id,
		type: d.type,
		title: d.title ?? null,
		url: d.url ?? null,
		icon: d.icon ?? null,
		embedType: d.embedType ?? null,
		embedUrl: d.embedUrl ?? null,
		isEnabled: row.isEnabled,
		position: d.position,
		status: row.status,
		config: d.config ?? null,
		scheduledStart: d.scheduledStart ?? null,
		scheduledEnd: d.scheduledEnd ?? null,
		...(row.createdAt ? { createdAt: row.createdAt } : {}),
		...(row.updatedAt ? { updatedAt: row.updatedAt } : {}),
	};
}

// Bounded like the live form (contactSubmissionSchema), and the address must be
// a real one: the Inbox builds a mailto: from it, so `a@x.com?bcc=…` must never
// get in through a crafted backup. Legacy columns (phone/subject/company/…)
// get the short-text bound.
const importText = z.string().max(200).nullable().optional();
export const contactSubmissionImportSchema = z.object({
	id: z.string().max(100),
	/** "First Last" as submitContact stores it. */
	name: z.string().max(200),
	email: z.string().trim().email().max(CONTACT_FIELD_LIMITS.email),
	message: z.string().max(CONTACT_FIELD_LIMITS.message),
	phone: importText,
	subject: importText,
	company: importText,
	whereMet: importText,
	rating: z.number().nullable().optional(),
	attending: importText,
	guests: z.number().nullable().optional(),
	blockId: z.string().max(CONTACT_FIELD_LIMITS.blockId).nullable().optional(),
	blockTitle: importText,
	isRead: z.boolean().optional(),
	createdAt: importDateSchema.nullable().optional(),
	updatedAt: importDateSchema.nullable().optional(),
});

export type ContactSubmissionImport = z.infer<typeof contactSubmissionImportSchema>;

export const socialNetworkImportSchema = z.object({
	slug: z.string(),
	url: z.string(),
	isActive: z.boolean().optional().default(true),
	addedAt: importDateSchema.nullable().optional(),
});

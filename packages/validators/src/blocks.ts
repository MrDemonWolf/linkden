import { z } from "zod";
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
// /api/vcard + public.getVCard (read, which parse the stored block config with
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
	const result = blockConfigSchemaFor(type).safeParse(raw);
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
	scheduledStart?: Date | null;
	scheduledEnd?: Date | null;
};

function refineBlock(val: BlockRefineInput, ctx: z.RefinementCtx) {
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

export const reorderBlocksSchema = z
	.array(z.object({ id: z.string().min(1).max(64), position: z.number().int().min(0) }))
	.max(200);

export type CreateBlockInput = z.input<typeof createBlockSchema>;
export type UpdateBlockInput = z.input<typeof updateBlockSchema>;

// ─── Embed providers ────────────────────────────────────────────────────────
// One registry for every supported embed provider: the URL it accepts, its
// editor placeholder/label, and how to rewrite a user URL into a safe embed
// src. Shared by the public renderer, the admin editor, and server validation
// so the three can never drift.
export interface EmbedProvider {
	id: string;
	label: string;
	placeholder: string;
	/** A user URL is valid for this provider when it matches. */
	match: RegExp;
	/** Rewrite a valid URL to an embeddable src (null if not extractable). */
	toEmbedSrc: (url: string) => string | null;
}

export const EMBED_PROVIDERS: EmbedProvider[] = [
	{
		id: "youtube",
		label: "YouTube",
		placeholder: "https://youtube.com/watch?v=dQw4w9WgXcQ",
		match: /(?:youtube\.com\/(?:watch|embed)|youtu\.be\/)/i,
		toEmbedSrc(url) {
			const m = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]+)/);
			return m ? `https://www.youtube-nocookie.com/embed/${m[1]}` : null;
		},
	},
	{
		id: "spotify",
		label: "Spotify",
		placeholder: "https://open.spotify.com/track/...",
		match: /open\.spotify\.com\//i,
		toEmbedSrc(url) {
			const m = url.match(/spotify\.com\/(track|album|playlist|episode)\/([a-zA-Z0-9]+)/);
			return m ? `https://open.spotify.com/embed/${m[1]}/${m[2]}` : null;
		},
	},
	{
		id: "soundcloud",
		label: "SoundCloud",
		placeholder: "https://soundcloud.com/artist/track",
		match: /soundcloud\.com\//i,
		toEmbedSrc(url) {
			return `https://w.soundcloud.com/player/?url=${encodeURIComponent(url)}&auto_play=false&visual=true`;
		},
	},
];

export const EMBED_PROVIDER_MAP: Record<string, EmbedProvider> = Object.fromEntries(
	EMBED_PROVIDERS.map((p) => [p.id, p]),
);

/** True when the URL is acceptable for the given embed type (custom = any https/http). */
export function validateEmbedUrl(embedType: string, url: string): boolean {
	if (embedType === "custom") return /^https?:\/\//i.test(url);
	const provider = EMBED_PROVIDER_MAP[embedType];
	return provider ? provider.match.test(url) : true;
}

/**
 * Convert a stored embed URL into a safe iframe src. Known providers are
 * rewritten to their official embed endpoints (safe origin from a regex match);
 * custom/unknown types must be https:, blocking javascript:/data:/http:.
 */
export function getEmbedSrc(embedType: string | null, embedUrl: string | null): string | null {
	if (!embedUrl) return null;
	const provider = embedType ? EMBED_PROVIDER_MAP[embedType] : undefined;
	if (provider) return provider.toEmbedSrc(embedUrl);
	try {
		if (new URL(embedUrl).protocol !== "https:") return null;
	} catch {
		return null;
	}
	return embedUrl;
}

// ─── Backup/Import schemas ─────────────────────────────────────────────────
// These mirror DB columns so backup imports are validated against the actual schema
// rather than using z.any(). Shared here to prevent drift between backup.ts and blocks.ts.

export const blockImportSchema = z.object({
	id: z.string(),
	type: blockTypeSchema,
	title: z.string().nullable().optional(),
	url: z.string().nullable().optional(),
	icon: z.string().nullable().optional(),
	embedType: z.string().nullable().optional(),
	embedUrl: z.string().nullable().optional(),
	socialIcons: z.string().nullable().optional(),
	isEnabled: z.boolean().optional().default(true),
	position: z.number(),
	scheduledStart: z.number().nullable().optional(),
	scheduledEnd: z.number().nullable().optional(),
	status: z.enum(["published", "draft"]).optional().default("published"),
	config: z.string().nullable().optional(),
	createdAt: z.number().nullable().optional(),
	updatedAt: z.number().nullable().optional(),
});

export type BlockImport = z.infer<typeof blockImportSchema>;

/**
 * Re-check one backup row against the rules blocks.create enforces (http(s)
 * URLs, icon format, bounded title, per-type config). The wire schema above
 * stays loose so one bad row can't fail the whole restore; the importer skips
 * (and counts) rows this rejects, the same way settings are handled.
 */
export function validateBlockImport(row: BlockImport): BlockImport | null {
	const result = createBlockSchema.safeParse({
		id: row.id,
		type: row.type,
		title: row.title ?? undefined,
		url: row.url ?? undefined,
		icon: row.icon ?? undefined,
		embedType: row.embedType ?? undefined,
		embedUrl: row.embedUrl ?? undefined,
		position: row.position,
		config: row.config ?? undefined,
	});
	return result.success ? row : null;
}

export const contactSubmissionImportSchema = z.object({
	id: z.string(),
	name: z.string(),
	email: z.string(),
	message: z.string(),
	phone: z.string().nullable().optional(),
	subject: z.string().nullable().optional(),
	company: z.string().nullable().optional(),
	whereMet: z.string().nullable().optional(),
	rating: z.number().nullable().optional(),
	attending: z.string().nullable().optional(),
	guests: z.number().nullable().optional(),
	blockId: z.string().nullable().optional(),
	blockTitle: z.string().nullable().optional(),
	isRead: z.boolean().optional(),
	createdAt: z.number().nullable().optional(),
	updatedAt: z.number().nullable().optional(),
});

export const socialNetworkImportSchema = z.object({
	slug: z.string(),
	url: z.string(),
	isActive: z.boolean().optional().default(true),
	addedAt: z.number().nullable().optional(),
});

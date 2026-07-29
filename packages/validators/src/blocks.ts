import { z } from "zod";

export const blockTypeSchema = z.enum(["link", "header", "embed", "connect", "vcard", "location"]);

export type BlockType = z.infer<typeof blockTypeSchema>;

export const blockConfigBaseSchema = z.object({
	layout: z.enum(["full", "inline"]).default("full").optional(),
	colorVariant: z.string().optional(),
	customBgColor: z.string().optional(),
	customTextColor: z.string().optional(),
	customBorderColor: z.string().optional(),
	borderRadius: z.string().optional(),
	borderWidth: z.number().optional(),
	shadow: z.string().optional(),
	animation: z.string().optional(),
	padding: z.string().optional(),
});

export const linkConfigSchema = blockConfigBaseSchema.extend({
	emoji: z.string().optional(),
	emojiPosition: z.enum(["left", "right"]).optional(),
	iconSlug: z.string().optional(),
	iconPosition: z.enum(["left", "right"]).optional(),
	textAlign: z.enum(["left", "center", "right"]).optional(),
	fontWeight: z.string().optional(),
	isOutlined: z.boolean().optional(),
	openInNewTab: z.boolean().optional(),
	description: z.string().optional(),
	thumbnail: z.string().optional(),
	isHighlighted: z.boolean().optional(),
});

export const headerConfigSchema = blockConfigBaseSchema.extend({
	headingLevel: z.enum(["h1", "h2", "h3", "h4", "h5", "h6"]).optional(),
	textAlign: z.enum(["left", "center", "right"]).optional(),
	fontWeight: z.string().optional(),
	emoji: z.string().optional(),
	emojiPosition: z.enum(["left", "right"]).optional(),
	showDivider: z.boolean().optional(),
});

export const whereMetOptions = [
	"Conference",
	"Online",
	"Work",
	"Mutual Friend",
	"Social Media",
	"Other",
] as const;

export const connectConfigSchema = blockConfigBaseSchema.extend({
	displayMode: z.enum(["inline", "modal"]).default("modal"),
	buttonText: z.string().optional(),
	buttonEmoji: z.string().optional(),
	buttonEmojiPosition: z.enum(["left", "right"]).optional(),
	successMessage: z.string().optional(),
	isOutlined: z.boolean().optional(),
	textAlign: z.enum(["left", "center", "right"]).optional(),
});

export const embedConfigSchema = blockConfigBaseSchema.extend({
	aspectRatio: z.string().optional(),
	maxWidth: z.string().optional(),
	showTitle: z.boolean().optional(),
});

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

export const vcardConfigSchema = blockConfigBaseSchema.extend({
	fullName: z.string().optional(),
	nickname: z.string().optional(),
	birthday: z.string().optional(),
	photo: z.string().optional(),
	org: z.string().optional(),
	title: z.string().optional(),
	department: z.string().optional(),
	workEmail: z.string().optional(),
	workPhone: z.string().optional(),
	email: z.string().optional(),
	phone: z.string().optional(),
	address: z.string().optional(),
	urls: z.array(z.object({ label: z.string(), url: z.string() })).optional(),
	buttonText: z.string().optional(),
	buttonEmoji: z.string().optional(),
	buttonEmojiPosition: z.enum(["left", "right"]).optional(),
	isOutlined: z.boolean().optional(),
});

export const locationConfigSchema = blockConfigBaseSchema.extend({
	address: z.string().optional(),
	displayMode: z.enum(["text", "map"]).default("text"),
	linkType: z.enum(["google", "apple", "custom", "none"]).default("none"),
	customLinkUrl: z.string().optional(),
	coordinates: z.object({ lat: z.number(), lng: z.number() }).optional(),
});

export const createBlockSchema = z.object({
	type: blockTypeSchema,
	title: z.string().optional(),
	url: z.string().url().optional(),
	icon: z.string().optional(),
	embedType: z.string().optional(),
	embedUrl: z.string().url().optional(),
	isEnabled: z.boolean().optional(),
	position: z.number(),
	scheduledStart: z.number().optional(),
	scheduledEnd: z.number().optional(),
	config: z
		.union([
			linkConfigSchema,
			headerConfigSchema,
			embedConfigSchema,
			connectConfigSchema,
			vcardConfigSchema,
			locationConfigSchema,
			blockConfigBaseSchema,
		])
		.optional(),
});

export const updateBlockSchema = z.object({
	id: z.string(),
	type: blockTypeSchema.optional(),
	title: z.string().optional(),
	url: z.string().url().optional(),
	icon: z.string().optional(),
	embedType: z.string().optional(),
	embedUrl: z.string().url().optional(),
	isEnabled: z.boolean().optional(),
	position: z.number().optional(),
	scheduledStart: z.number().optional(),
	scheduledEnd: z.number().optional(),
	config: z
		.union([
			linkConfigSchema,
			headerConfigSchema,
			embedConfigSchema,
			connectConfigSchema,
			vcardConfigSchema,
			locationConfigSchema,
			blockConfigBaseSchema,
		])
		.optional(),
});

export const reorderBlocksSchema = z.array(
	z.object({
		id: z.string(),
		position: z.number(),
	}),
);

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

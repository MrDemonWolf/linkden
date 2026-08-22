import { type BlockType, blockTypeSchema, EMBED_PROVIDERS } from "@linkden/validators/blocks";
import type { LucideIcon } from "lucide-react";
import {
	AlignLeft,
	Code,
	Contact,
	Image,
	Link as LinkIcon,
	MapPin,
	Minus,
	Type,
	Users,
} from "lucide-react";

export type { BlockType };

export const BLOCK_TYPES: ReadonlyArray<{
	type: BlockType;
	label: string;
	icon: LucideIcon;
	description: string;
}> = [
	{ type: "link", label: "Link", icon: LinkIcon, description: "A clickable link button" },
	{ type: "header", label: "Header", icon: Type, description: "A text header/divider" },
	{ type: "embed", label: "Embed", icon: Code, description: "YouTube, Spotify, or other embed" },
	{
		type: "connect",
		label: "Connect With Me",
		icon: Users,
		description: "Contact form with presets",
	},
	{ type: "vcard", label: "vCard", icon: Contact, description: "Download contact card button" },
	{
		type: "location",
		label: "Location",
		icon: MapPin,
		description: "Show your location on a map",
	},
	{
		type: "image",
		label: "Image",
		icon: Image,
		description: "Photo with optional caption and link",
	},
	{ type: "text", label: "Text", icon: AlignLeft, description: "A short paragraph" },
	{ type: "divider", label: "Divider", icon: Minus, description: "Line or spacing" },
];

// Config a freshly added block starts with (handleAddBlock sends it on create).
// An image block is valid with an empty `src` — the renderer skips it until the
// user uploads a picture.
export const DEFAULT_BLOCK_CONFIG: Record<BlockType, object> = {
	link: {},
	header: {},
	embed: {},
	connect: {
		preset: "contact",
		buttonText: "Contact Me",
		buttonEmoji: "",
		successMessage: "Thanks for reaching out!",
	},
	vcard: { buttonText: "Download Contact", buttonEmoji: "" },
	location: { address: "", linkType: "none" },
	image: { src: "", alt: "", aspect: "16:9" },
	text: { body: "Write something here." },
	divider: { style: "line", size: "md" },
};

// Runtime sanity: BLOCK_TYPES must list every BlockType from the validator enum.
if (process.env.NODE_ENV !== "production") {
	const declared = new Set(BLOCK_TYPES.map((b) => b.type));
	for (const t of blockTypeSchema.options) {
		if (!declared.has(t)) throw new Error(`BLOCK_TYPES missing entry for "${t}"`);
	}
}

export interface Block {
	id: string;
	type: string;
	title: string | null;
	url: string | null;
	icon: string | null;
	embedType: string | null;
	embedUrl: string | null;
	socialIcons: string | null;
	isEnabled: boolean;
	position: number;
	status: "published" | "draft";
	scheduledStart: Date | null;
	scheduledEnd: Date | null;
	config: string | null;
	createdAt: Date;
	updatedAt: Date;
}

export function generateId() {
	return crypto.randomUUID();
}

// Editor metadata for the embed URL field, derived from the shared provider
// registry so patterns/labels never drift from the public renderer + validation.
export const EMBED_URL_PATTERNS: Record<
	string,
	{ pattern: RegExp; placeholder: string; label: string }
> = {
	...Object.fromEntries(
		EMBED_PROVIDERS.map((p) => [
			p.id,
			{ pattern: p.match, placeholder: p.placeholder, label: p.label },
		]),
	),
	custom: {
		pattern: /^https?:\/\//i,
		placeholder: "https://example.com/embed",
		label: "Custom",
	},
};

export function validateEmbedUrl(type: string, url: string): string | null {
	if (!url || !type) return null;
	const config = EMBED_URL_PATTERNS[type];
	if (!config) return null;
	if (type === "custom") return null;
	if (!config.pattern.test(url)) {
		return `This doesn't look like a ${config.label} URL`;
	}
	return null;
}

export function blockTypeIcon(type: string) {
	const found = BLOCK_TYPES.find((t) => t.type === type);
	return found ? found.icon : LinkIcon;
}

// One chip tint for every block type. The per-type rainbow (blue/violet/
// emerald/amber/pink/sky) was the only place in the admin using raw palette
// classes; the block icon already carries the type.
export const TYPE_CHIP = "bg-primary/10 text-primary";

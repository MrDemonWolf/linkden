import { Link as LinkIcon, Type, Code, Contact, MapPin, Users } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { blockTypeSchema, type BlockType } from "@linkden/validators/blocks";

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
];

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

export const EMBED_URL_PATTERNS: Record<
	string,
	{ pattern: RegExp; placeholder: string; label: string }
> = {
	youtube: {
		pattern: /(?:youtube\.com\/(?:watch|embed)|youtu\.be\/)/i,
		placeholder: "https://youtube.com/watch?v=dQw4w9WgXcQ",
		label: "YouTube",
	},
	spotify: {
		pattern: /open\.spotify\.com\//i,
		placeholder: "https://open.spotify.com/track/...",
		label: "Spotify",
	},
	soundcloud: {
		pattern: /soundcloud\.com\//i,
		placeholder: "https://soundcloud.com/artist/track",
		label: "SoundCloud",
	},
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

export function blockTypeColor(type: string): string {
	const map: Record<string, string> = {
		link: "hsl(var(--primary))",
		header: "#7C3AED",
		embed: "#10B981",
		connect: "#F59E0B",
		vcard: "#EC4899",
		location: "#3B82F6",
	};
	return map[type] ?? "hsl(var(--muted))";
}

export const TYPE_ACCENT: Record<string, string> = {
	link: "bg-blue-500",
	header: "bg-violet-500",
	embed: "bg-emerald-500",
	connect: "bg-amber-500",
	vcard: "bg-pink-500",
	location: "bg-sky-500",
};

// Badge/icon-chip tints. Text uses -700 in light (AA-legible on the -500/10
// tint) and -400 in dark; background tint kept identical across modes.
export const TYPE_BADGE_BG: Record<string, string> = {
	link: "bg-blue-500/10 text-blue-700 dark:text-blue-400",
	header: "bg-violet-500/10 text-violet-700 dark:text-violet-400",
	embed: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
	connect: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
	vcard: "bg-pink-500/10 text-pink-700 dark:text-pink-400",
	location: "bg-sky-500/10 text-sky-700 dark:text-sky-400",
};

import {
	Link as LinkIcon,
	Type,
	Share2,
	Code,
	MessageSquare,
	Contact,
	MapPin,
} from "lucide-react";

export const BLOCK_TYPES = [
	{ type: "link" as const, label: "Link", icon: LinkIcon, description: "A clickable link button" },
	{ type: "header" as const, label: "Header", icon: Type, description: "A text header/divider" },
	{ type: "social_icons" as const, label: "Social Icons", icon: Share2, description: "Row of social media icons" },
	{ type: "embed" as const, label: "Embed", icon: Code, description: "YouTube, Spotify, or other embed" },
	{ type: "form" as const, label: "Form", icon: MessageSquare, description: "Customizable form with presets" },
	{ type: "vcard" as const, label: "vCard", icon: Contact, description: "Download contact card button" },
	{ type: "location" as const, label: "Location", icon: MapPin, description: "Display your location with a map" },
] as const;

export type BlockType = (typeof BLOCK_TYPES)[number]["type"];

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
	return `blk_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export const EMBED_URL_PATTERNS: Record<string, { pattern: RegExp; placeholder: string; label: string }> = {
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
		social_icons: "#3B82F6",
		embed: "#10B981",
		form: "#F59E0B",
		vcard: "#EC4899",
		location: "#0EA5E9",
	};
	return map[type] ?? "hsl(var(--muted))";
}

export const TYPE_ACCENT: Record<string, string> = {
	link: "bg-blue-500",
	header: "bg-violet-500",
	social_icons: "bg-emerald-500",
	embed: "bg-amber-500",
	form: "bg-pink-500",
	vcard: "bg-teal-500",
	location: "bg-sky-500",
};

export const TYPE_BADGE_BG: Record<string, string> = {
	link: "bg-blue-500/10 text-blue-400",
	header: "bg-violet-500/10 text-violet-400",
	social_icons: "bg-emerald-500/10 text-emerald-400",
	embed: "bg-amber-500/10 text-amber-400",
	form: "bg-pink-500/10 text-pink-400",
	vcard: "bg-teal-500/10 text-teal-400",
	location: "bg-sky-500/10 text-sky-400",
};

/**
 * Transforms a LinkStack export into LinkDen-compatible blocks and settings.
 */

interface LinkStackLink {
	button_id?: string;
	link?: string;
	title?: string;
	order?: number;
	click_number?: number;
	custom_css?: string;
	custom_icon?: string;
	type?: number;
	type_params?: string;
}

interface LinkStackExport {
	name?: string;
	littlelink_name?: string;
	littlelink_description?: string;
	theme?: string;
	links?: LinkStackLink[];
	profile_image?: string;
}

interface LinkDenBlock {
	id: string;
	type: "link";
	title: string;
	url: string;
	icon: string | null;
	isEnabled: boolean;
	position: number;
	status: "published";
	createdAt: Date;
	updatedAt: Date;
}

interface TransformResult {
	blocks: LinkDenBlock[];
	settings: Record<string, string>;
}

const BUTTON_ID_TO_ICON: Record<string, string> = {
	custom_website: "globe",
	website: "globe",
	github: "github",
	twitter: "twitter",
	x: "twitter",
	instagram: "instagram",
	facebook: "facebook",
	linkedin: "linkedin",
	youtube: "youtube",
	tiktok: "music",
	twitch: "twitch",
	discord: "message-circle",
	telegram: "send",
	reddit: "hash",
	email: "mail",
	mail: "mail",
	phone: "phone",
	whatsapp: "message-circle",
	snapchat: "camera",
	pinterest: "pin",
	spotify: "music",
	soundcloud: "music",
	apple_music: "music",
	bandcamp: "music",
	patreon: "heart",
	ko_fi: "coffee",
	buy_me_a_coffee: "coffee",
	paypal: "credit-card",
	venmo: "credit-card",
	cashapp: "dollar-sign",
	steam: "gamepad-2",
	epic_games: "gamepad-2",
	playstation: "gamepad-2",
	xbox: "gamepad-2",
	blog: "book-open",
	portfolio: "briefcase",
	resume: "file-text",
	mastodon: "at-sign",
	bluesky: "cloud",
};

function generateId(): string {
	return crypto.randomUUID();
}

function mapButtonIdToIcon(buttonId: string | undefined): string | null {
	if (!buttonId) return null;
	const normalized = buttonId.toLowerCase().replace(/[-\s]/g, "_");
	return BUTTON_ID_TO_ICON[normalized] ?? null;
}

export function isLinkStackExport(data: unknown): data is LinkStackExport {
	if (typeof data !== "object" || data === null) return false;
	const obj = data as Record<string, unknown>;
	return (
		("littlelink_name" in obj || "littlelink_description" in obj) &&
		Array.isArray(obj.links)
	);
}

export function transformLinkStackData(raw: LinkStackExport): TransformResult {
	const now = new Date();
	const blocks: LinkDenBlock[] = (raw.links ?? [])
		.filter((link) => link.link)
		.map((link, index) => ({
			id: generateId(),
			type: "link" as const,
			title: link.title ?? link.button_id ?? "Untitled",
			url: link.link!,
			icon: mapButtonIdToIcon(link.button_id),
			isEnabled: true,
			position: link.order ?? index,
			status: "published" as const,
			createdAt: now,
			updatedAt: now,
		}));

	const settings: Record<string, string> = {};

	if (raw.littlelink_name) {
		settings.display_name = raw.littlelink_name;
	}
	if (raw.littlelink_description) {
		settings.bio = raw.littlelink_description;
	}
	if (raw.theme) {
		settings.theme = raw.theme;
	}

	return { blocks, settings };
}

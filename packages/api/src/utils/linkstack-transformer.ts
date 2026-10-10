/**
 * Transforms a LinkStack export into LinkDen-compatible blocks and settings.
 */

import { httpUrlSchema } from "@linkden/validators/blocks";
import { themePresetFromName } from "@linkden/validators/settings-registry";
import { SOCIAL_SLUGS } from "@linkden/validators/social";

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

// LinkStack button ids whose LinkDen brand slug is spelled differently once
// separators are dropped (`apple_music` → `applemusic` needs no alias).
const BRAND_ALIASES: Record<string, string> = {
	twitter: "x",
};

// Non-brand buttons → generic lucide icons. Brand networks resolve to
// `brand:<slug>` glyphs instead: lucide-react no longer ships brand icons, so a
// bare `github`/`instagram` name would render nothing.
const GENERIC_ICONS: Record<string, string> = {
	custom_website: "lucide:globe",
	website: "lucide:globe",
	email: "lucide:mail",
	mail: "lucide:mail",
	phone: "lucide:phone",
	blog: "lucide:book-open",
	portfolio: "lucide:briefcase",
	resume: "lucide:file-text",
};

const BRAND_SLUGS = new Set<string>(SOCIAL_SLUGS);

function generateId(): string {
	return crypto.randomUUID();
}

// Lookups use Object.hasOwn: button ids come from an untrusted export, and a
// plain-object index would resolve `constructor` / `__proto__` / `toString`.
export function mapButtonIdToIcon(buttonId: string | undefined): string | null {
	if (!buttonId) return null;
	const normalized = buttonId.toLowerCase().replace(/[-\s]/g, "_");
	const slug = Object.hasOwn(BRAND_ALIASES, normalized)
		? BRAND_ALIASES[normalized]
		: normalized.replace(/_/g, "");
	if (slug && BRAND_SLUGS.has(slug)) return `brand:${slug}`;
	return Object.hasOwn(GENERIC_ICONS, normalized) ? (GENERIC_ICONS[normalized] ?? null) : null;
}

/**
 * Map a LinkStack theme name onto a LinkDen theme preset. Only names that match
 * a preset are carried over; anything else returns null rather than writing a
 * value nothing reads.
 */
export function mapThemeToPreset(theme: string | undefined): string | null {
	// Shared with the admin import wizard, which previews the same decision.
	return themePresetFromName(theme);
}

export function isLinkStackExport(data: unknown): data is LinkStackExport {
	if (typeof data !== "object" || data === null) return false;
	const obj = data as Record<string, unknown>;
	return ("littlelink_name" in obj || "littlelink_description" in obj) && Array.isArray(obj.links);
}

/**
 * @param options.startPosition First position to assign. Pass one past the
 *   current maximum block position so imported links append after the existing
 *   page instead of colliding with (and interleaving into) it.
 */
export function transformLinkStackData(
	raw: LinkStackExport,
	{ startPosition = 0 }: { startPosition?: number } = {},
): TransformResult {
	const now = new Date();
	// Only http(s) links become blocks — the public page renders `url` as a
	// raw href, so the export's javascript:/data: entries must not get through.
	// LinkStack's `order` is kept as the sort key, then positions are made
	// dense so two links can never share one.
	const blocks: LinkDenBlock[] = (raw.links ?? [])
		.map((link, index) => ({ link, sortKey: link.order ?? index }))
		.filter(({ link }) => httpUrlSchema.safeParse(link.link).success)
		.sort((a, b) => a.sortKey - b.sortKey)
		.map(({ link }, index) => ({
			id: generateId(),
			type: "link" as const,
			title: link.title ?? link.button_id ?? "Untitled",
			url: link.link!,
			icon: mapButtonIdToIcon(link.button_id),
			isEnabled: true,
			position: startPosition + index,
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
	const themePreset = mapThemeToPreset(raw.theme);
	if (themePreset) {
		settings.theme_preset = themePreset;
	}

	return { blocks, settings };
}

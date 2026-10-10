import { OG_TEMPLATE_IDS, SETTING_REGISTRY } from "@linkden/validators/settings-registry";
import { pagePrimaryColor } from "./theme-colors";

const DEFAULT_TEMPLATE = OG_TEMPLATE_IDS[0];
const DEFAULT_NAME = "My Links";
const DEFAULT_THEME = "#6366f1";
const NAME_MAX = SETTING_REGISTRY.seo_title?.maxLength ?? 100;
const BIO_MAX = SETTING_REGISTRY.bio?.maxLength ?? 300;

export type OgTemplate = (typeof OG_TEMPLATE_IDS)[number];

export interface OgParams {
	template: OgTemplate;
	name: string;
	bio: string;
	theme: string;
}

// Idempotent, so a canonical URL normalizes to itself (no 307 loop): trimmed
// again after the cut, and never ending in half a surrogate pair (which
// URLSearchParams would re-encode as U+FFFD).
function bounded(value: string | null, fallback: string, maxLength: number): string {
	const cut = (value ?? fallback)
		.trim()
		.slice(0, maxLength)
		.replace(/[\uD800-\uDBFF]$/, "")
		.trim();
	return cut || fallback;
}

export function normalizeOgParams(searchParams: URLSearchParams): OgParams {
	const requestedTemplate = searchParams.get("template");
	const template =
		OG_TEMPLATE_IDS.find((candidate) => candidate === requestedTemplate) ?? DEFAULT_TEMPLATE;
	const requestedTheme = searchParams.get("theme")?.trim() ?? "";

	return {
		template,
		name: bounded(searchParams.get("name"), DEFAULT_NAME, NAME_MAX),
		bio: bounded(searchParams.get("bio"), "", BIO_MAX),
		theme: /^#[0-9a-f]{6}$/i.test(requestedTheme) ? requestedTheme.toLowerCase() : DEFAULT_THEME,
	};
}

export function canonicalOgSearch(params: OgParams, avatar: string): string {
	const search = new URLSearchParams({
		template: params.template,
		name: params.name,
		bio: params.bio,
		theme: params.theme,
	});
	if (avatar) search.set("avatar", avatar);
	return search.toString();
}

export function ogRateLimitKey(headers: Pick<Headers, "get">): string {
	return headers.get("cf-connecting-ip") ?? "";
}

export function normalizeOgAvatar(
	raw: string | null,
	baseOrigin: string,
	allowedOrigins: ReadonlySet<string>,
): string {
	if (!raw || raw.length > 2_048) return "";
	try {
		const url = new URL(raw, baseOrigin);
		if (
			(url.protocol !== "https:" && url.protocol !== "http:") ||
			!allowedOrigins.has(url.origin) ||
			url.username ||
			url.password ||
			!url.pathname.startsWith("/api/images/")
		) {
			return "";
		}
		url.search = "";
		url.hash = "";
		return url.toString();
	} catch {
		return "";
	}
}

/**
 * Origins an OG avatar may come from — images this deployment serves: the
 * request's own origin, the API origin and the site origin. Shared by the
 * route and generateMetadata so both canonicalize the avatar identically.
 */
export function ogAllowedOrigins(...extra: Array<string | null | undefined>): Set<string> {
	const origins = new Set<string>();
	for (const o of [
		...extra,
		process.env.NEXT_PUBLIC_SERVER_URL,
		process.env.NEXT_PUBLIC_SITE_URL,
	]) {
		if (!o) continue;
		try {
			origins.add(new URL(o).origin);
		} catch {
			// Not an absolute URL — skip.
		}
	}
	return origins;
}

/** The OG `theme` colour: the custom primary, else the active preset's light primary. */
export function ogThemeColor(
	settings: { customPrimary?: string | null; themePreset?: string | null } | null | undefined,
): string {
	return pagePrimaryColor(settings, DEFAULT_THEME);
}

/** The stored-profile fields an OG card is drawn from (public.getPage). */
export interface OgSource {
	profile: { name?: string | null; bio?: string | null; image?: string | null } | null;
	settings: {
		customPrimary?: string | null;
		themePreset?: string | null;
		seoOgTemplate?: string | null;
	} | null;
}

export interface OgContent {
	params: OgParams;
	avatar: string;
}

/**
 * Canonical card content for the stored profile. The avatar is kept only for
 * the template that draws it, so other templates don't vary their cache key.
 */
export function ogContentFromPage(
	page: OgSource | null,
	template: string | null,
	siteOrigin: string,
	allowedOrigins: ReadonlySet<string>,
): OgContent {
	const params = normalizeOgParams(
		new URLSearchParams({
			template: template ?? page?.settings?.seoOgTemplate ?? DEFAULT_TEMPLATE,
			name: page?.profile?.name || DEFAULT_NAME,
			bio: page?.profile?.bio || "",
			theme: ogThemeColor(page?.settings),
		}),
	);
	const avatar =
		params.template === "profile"
			? normalizeOgAvatar(page?.profile?.image ?? null, siteOrigin, allowedOrigins)
			: "";
	return { params, avatar };
}

/** `/og?…` exactly as the route's canonical-redirect check expects it (no 307). */
export function ogImagePath(content: OgContent): string {
	return `/og?${canonicalOgSearch(content.params, content.avatar)}`;
}

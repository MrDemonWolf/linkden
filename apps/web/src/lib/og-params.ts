import { OG_TEMPLATE_IDS, SETTING_REGISTRY } from "@linkden/validators/settings-registry";

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

function bounded(value: string | null, fallback: string, maxLength: number): string {
	return (value ?? fallback).trim().slice(0, maxLength) || fallback;
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

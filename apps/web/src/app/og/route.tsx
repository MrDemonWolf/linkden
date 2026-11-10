import { getCloudflareContext } from "@opennextjs/cloudflare";
import { ImageResponse } from "next/og";
import type { NextRequest } from "next/server";
import { hasSessionCookie } from "@/lib/admin-routes";
import {
	canonicalOgSearch,
	normalizeOgAvatar,
	normalizeOgParams,
	type OgContent,
	ogAllowedOrigins,
	ogContentFromPage,
	ogRateLimitKey,
} from "@/lib/og-params";
import { OG_IMAGE_SIZE, renderOgTemplate } from "@/lib/og-template";
import { getPublicPage } from "@/lib/public-page";
import { apiFetch } from "@/lib/server-api";

/**
 * A session cookie's presence proves nothing — anyone can send one. Ask the
 * API (Better Auth) whether it is a live session before rendering query-supplied
 * preview content. Any failure counts as "not signed in".
 */
async function hasValidSession(req: NextRequest): Promise<boolean> {
	try {
		const res = await apiFetch("/api/auth/get-session", {
			headers: { cookie: req.headers.get("cookie") ?? "" },
			cache: "no-store",
		});
		if (!res.ok) return false;
		const body = (await res.json().catch(() => null)) as { session?: unknown } | null;
		return Boolean(body?.session);
	} catch {
		return false;
	}
}

// Node runtime (the default): OpenNext Cloudflare serves no Edge-runtime
// routes, so `runtime = "edge"` left /og — every og:image — unreachable.

const PUBLIC_CACHE_CONTROL = "public, max-age=86400, s-maxage=604800, stale-while-revalidate=86400";

type RateLimitBinding = {
	limit(options: { key: string }): Promise<{ success: boolean }>;
};

async function allowOgRender(req: NextRequest): Promise<boolean> {
	let limiter: RateLimitBinding | undefined;
	try {
		limiter = (getCloudflareContext().env as { RL_OG?: RateLimitBinding }).RL_OG;
	} catch {
		// `next dev` has no Cloudflare bindings; production always supplies RL_OG.
		return process.env.NODE_ENV !== "production";
	}
	if (!limiter) return process.env.NODE_ENV !== "production";

	return (await limiter.limit({ key: ogRateLimitKey(req.headers) })).success;
}

/** The colo's Workers cache (a Worker's own responses never reach the CDN cache). */
function edgeCache(): Cache | undefined {
	const c = (globalThis as { caches?: { default?: Cache } }).caches;
	return c?.default;
}

function waitUntil(promise: Promise<unknown>) {
	try {
		getCloudflareContext().ctx.waitUntil(promise);
	} catch {
		// `next dev` — no execution context; let it settle on its own.
		promise.catch(() => {});
	}
}

const AVATAR_MAX_BYTES = 5 * 1024 * 1024;

/**
 * The avatar as a data: URL, read through the API service binding. Satori
 * would otherwise fetch the /api/images URL itself, and a Worker's fetch to its
 * own zone skips the zone's Routes (lib/server-api.ts) — it would hit this web
 * worker, not the API. "" (initials fallback) on any failure or a format the
 * renderer can't decode (it has no WebP support).
 */
async function avatarDataUrl(src: string): Promise<string> {
	if (!src) return "";
	try {
		const res = await apiFetch(new URL(src).pathname);
		const type = res.headers.get("content-type")?.split(";")[0]?.trim() ?? "";
		if (!res.ok || !/^image\/(png|jpeg|gif)$/.test(type)) return "";
		const bytes = await res.arrayBuffer();
		if (bytes.byteLength > AVATAR_MAX_BYTES) return "";
		return `data:${type};base64,${Buffer.from(bytes).toString("base64")}`;
	} catch {
		return "";
	}
}

export async function GET(req: NextRequest) {
	const { searchParams } = req.nextUrl;
	const origin = req.nextUrl.origin;
	// The avatar is fetched by the image renderer, so an arbitrary URL would turn
	// this route into an open image proxy (and an SSRF vector). Only images this
	// deployment serves are allowed (same-origin, the API or the site origin);
	// everything else renders the initials fallback. Only the profile template
	// draws it, so it is not part of any other template's canonical URL.
	const allowedOrigins = ogAllowedOrigins(origin);
	const params = normalizeOgParams(searchParams);
	const avatar =
		params.template === "profile"
			? normalizeOgAvatar(searchParams.get("avatar"), origin, allowedOrigins)
			: "";
	const canonicalSearch = canonicalOgSearch(params, avatar);
	if (searchParams.toString() !== canonicalSearch) {
		const canonicalUrl = new URL(req.nextUrl);
		canonicalUrl.search = canonicalSearch;
		return new Response(null, {
			status: 307,
			headers: { "Cache-Control": "private, no-store", Location: canonicalUrl.toString() },
		});
	}

	// Anonymous requests (crawlers, chat unfurlers, anyone following a shared
	// link) always get the STORED profile: the name/bio/theme/avatar in the
	// query only version the URL, so a crafted /og?name=… can't put someone
	// else's words on this domain. Only a signed-in admin's own browser (the
	// SEO tab's live preview of unsaved values) has its query rendered, and
	// that response is never cached.
	const adminPreview = hasSessionCookie(req.cookies) && (await hasValidSession(req));
	const cache = adminPreview ? undefined : edgeCache();
	if (cache) {
		const hit = await cache.match(req.url).catch(() => undefined);
		// Cache hits skip the limiter: the image hasn't changed.
		if (hit) return hit;
	}

	if (!(await allowOgRender(req))) {
		return new Response("Too many image requests", {
			status: 429,
			headers: { "Cache-Control": "private, no-store", "Retry-After": "60" },
		});
	}

	let content: OgContent = { params, avatar };
	let cacheable = !adminPreview;
	if (!adminPreview) {
		const page = await getPublicPage();
		// API down: generic card, not cached, so the real one renders next time.
		if (!page) cacheable = false;
		content = ogContentFromPage(page, params.template, origin, allowedOrigins);
	}
	const avatarSrc = await avatarDataUrl(content.avatar);

	const element = renderOgTemplate(content.params, avatarSrc);

	const response = new ImageResponse(element, OG_IMAGE_SIZE);

	if (!cacheable) {
		response.headers.set("Cache-Control", "private, no-store");
		return response;
	}
	// 1 day in browsers; the Workers cache (keyed on the canonical URL, which
	// changes whenever the profile does) spares satori + resvg on repeat fetches.
	response.headers.set("Cache-Control", PUBLIC_CACHE_CONTROL);
	if (cache) waitUntil(cache.put(req.url, response.clone()));
	return response;
}

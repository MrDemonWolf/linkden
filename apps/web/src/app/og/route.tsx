import { hexToRgb } from "@linkden/ui/color-contrast";
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

function darken(hex: string, amount: number): string {
	const rgb = hexToRgb(hex) ?? { r: 99, g: 102, b: 241 };
	const f = 1 - amount;
	return `rgb(${Math.round(rgb.r * f)}, ${Math.round(rgb.g * f)}, ${Math.round(rgb.b * f)})`;
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
	const { template, name, bio, theme } = content.params;
	const avatarSrc = await avatarDataUrl(content.avatar);

	const width = 1200;
	const height = 630;
	const darkTheme = darken(theme, 0.3);

	const templates: Record<string, React.ReactElement> = {
		minimal: (
			<div
				style={{
					display: "flex",
					flexDirection: "column",
					alignItems: "center",
					justifyContent: "center",
					width: "100%",
					height: "100%",
					backgroundColor: "#fafafa",
					fontFamily: "sans-serif",
					position: "relative",
				}}
			>
				{/* Subtle decorative dots */}
				<div style={{ display: "flex", position: "absolute", top: 40, left: 40, opacity: 0.06 }}>
					{Array.from({ length: 8 }).map((_, i) => (
						<div key={i} style={{ display: "flex", flexDirection: "column", marginRight: 24 }}>
							{Array.from({ length: 5 }).map((_, j) => (
								<div
									key={j}
									style={{
										width: 6,
										height: 6,
										borderRadius: "50%",
										backgroundColor: "#000",
										marginBottom: 24,
									}}
								/>
							))}
						</div>
					))}
				</div>
				<div
					style={{
						display: "flex",
						width: 56,
						height: 4,
						borderRadius: 2,
						backgroundColor: theme,
						marginBottom: 32,
					}}
				/>
				<div
					style={{
						fontSize: 64,
						fontWeight: 700,
						color: "#111",
						letterSpacing: -2,
					}}
				>
					{name}
				</div>
				{bio && (
					<div
						style={{
							fontSize: 26,
							color: "#666",
							marginTop: 16,
							maxWidth: 700,
							textAlign: "center",
							lineHeight: 1.4,
						}}
					>
						{bio}
					</div>
				)}
				<div
					style={{
						display: "flex",
						position: "absolute",
						bottom: 40,
						fontSize: 16,
						color: "#aaa",
						letterSpacing: 2,
					}}
				>
					LINKDEN
				</div>
			</div>
		),

		gradient: (
			<div
				style={{
					display: "flex",
					flexDirection: "column",
					alignItems: "center",
					justifyContent: "center",
					width: "100%",
					height: "100%",
					background: `linear-gradient(135deg, ${theme} 0%, ${darkTheme} 50%, #0f0f23 100%)`,
					fontFamily: "sans-serif",
					position: "relative",
					overflow: "hidden",
				}}
			>
				{/* Decorative circle */}
				<div
					style={{
						display: "flex",
						position: "absolute",
						top: -120,
						right: -120,
						width: 400,
						height: 400,
						borderRadius: "50%",
						backgroundColor: "rgba(255,255,255,0.06)",
					}}
				/>
				<div
					style={{
						display: "flex",
						position: "absolute",
						bottom: -80,
						left: -80,
						width: 300,
						height: 300,
						borderRadius: "50%",
						backgroundColor: "rgba(255,255,255,0.04)",
					}}
				/>
				<div
					style={{
						fontSize: 76,
						fontWeight: 800,
						color: "#fff",
						letterSpacing: -2,
						textShadow: "0 4px 20px rgba(0,0,0,0.3)",
					}}
				>
					{name}
				</div>
				{bio && (
					<div
						style={{
							fontSize: 28,
							color: "rgba(255,255,255,0.85)",
							marginTop: 16,
							maxWidth: 700,
							textAlign: "center",
							lineHeight: 1.4,
						}}
					>
						{bio}
					</div>
				)}
			</div>
		),

		bold: (
			<div
				style={{
					display: "flex",
					width: "100%",
					height: "100%",
					backgroundColor: "#0a0a0a",
					fontFamily: "sans-serif",
					position: "relative",
					overflow: "hidden",
				}}
			>
				{/* Left accent bar */}
				<div
					style={{
						display: "flex",
						position: "absolute",
						left: 0,
						top: 0,
						width: 8,
						height: "100%",
						background: `linear-gradient(180deg, ${theme}, ${darkTheme})`,
					}}
				/>
				{/* Bottom accent line */}
				<div
					style={{
						display: "flex",
						position: "absolute",
						bottom: 0,
						left: 0,
						width: "100%",
						height: 3,
						background: `linear-gradient(90deg, ${theme}, transparent)`,
					}}
				/>
				{/* Corner accent */}
				<div
					style={{
						display: "flex",
						position: "absolute",
						top: 0,
						right: 0,
						width: 200,
						height: 200,
						background: `linear-gradient(225deg, ${theme}22, transparent)`,
					}}
				/>
				<div
					style={{
						display: "flex",
						flexDirection: "column",
						justifyContent: "center",
						padding: "0 80px 0 60px",
						flex: 1,
					}}
				>
					<div
						style={{
							fontSize: 20,
							fontWeight: 600,
							color: theme,
							letterSpacing: 3,
							textTransform: "uppercase",
							marginBottom: 16,
						}}
					>
						LINKS
					</div>
					<div
						style={{
							fontSize: 72,
							fontWeight: 800,
							color: "#fff",
							letterSpacing: -2,
							lineHeight: 1.1,
						}}
					>
						{name}
					</div>
					{bio && (
						<div
							style={{
								fontSize: 26,
								color: "rgba(255,255,255,0.6)",
								marginTop: 20,
								maxWidth: 700,
								lineHeight: 1.4,
							}}
						>
							{bio}
						</div>
					)}
				</div>
			</div>
		),

		profile: (
			<div
				style={{
					display: "flex",
					alignItems: "center",
					justifyContent: "center",
					width: "100%",
					height: "100%",
					background: `linear-gradient(160deg, #f0f0f0 0%, #e8e8e8 100%)`,
					fontFamily: "sans-serif",
				}}
			>
				<div
					style={{
						display: "flex",
						flexDirection: "column",
						alignItems: "center",
						backgroundColor: "#fff",
						borderRadius: 28,
						padding: "56px 80px",
						boxShadow: "0 8px 40px rgba(0,0,0,0.08), 0 1px 3px rgba(0,0,0,0.04)",
					}}
				>
					{/* Avatar */}
					{avatarSrc ? (
						/* eslint-disable-next-line @next/next/no-img-element */
						<img
							src={avatarSrc}
							alt=""
							width={100}
							height={100}
							style={{
								width: 100,
								height: 100,
								borderRadius: "50%",
								objectFit: "cover",
								marginBottom: 28,
								boxShadow: `0 4px 20px ${theme}44`,
							}}
						/>
					) : (
						<div
							style={{
								display: "flex",
								alignItems: "center",
								justifyContent: "center",
								width: 100,
								height: 100,
								borderRadius: "50%",
								background: `linear-gradient(135deg, ${theme}, ${darkTheme})`,
								color: "#fff",
								fontSize: 42,
								fontWeight: 700,
								marginBottom: 28,
								boxShadow: `0 4px 20px ${theme}44`,
							}}
						>
							{name
								.split(/\s+/)
								.slice(0, 2)
								.map((w) => w[0])
								.join("")
								.toUpperCase()}
						</div>
					)}
					<div
						style={{
							fontSize: 48,
							fontWeight: 700,
							color: "#111",
							letterSpacing: -1,
						}}
					>
						{name}
					</div>
					{bio && (
						<div
							style={{
								fontSize: 22,
								color: "#666",
								marginTop: 12,
								maxWidth: 460,
								textAlign: "center",
								lineHeight: 1.5,
							}}
						>
							{bio}
						</div>
					)}
					{/* Bottom accent */}
					<div
						style={{
							display: "flex",
							width: 40,
							height: 3,
							borderRadius: 2,
							backgroundColor: theme,
							marginTop: 28,
						}}
					/>
				</div>
			</div>
		),
	};

	const element = templates[template] ?? templates.minimal;

	const response = new ImageResponse(element, { width, height });

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

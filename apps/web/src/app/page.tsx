import { env } from "@linkden/env/web";
import type { Metadata, Viewport } from "next";
import { cookies, headers } from "next/headers";
import {
	COLOR_MODE_COOKIE,
	COLOR_SCHEME_HINT_HEADER,
	ColorModeScript,
	resolveInitialColorMode,
} from "@/components/public/color-mode-script";
import { PublicPage } from "@/components/public/public-page";
import { WelcomePage } from "@/components/welcome-page";
import { hasSessionCookie } from "@/lib/admin-routes";
import { withResolvedIcons } from "@/lib/block-icons";
import { ogAllowedOrigins, ogContentFromPage, ogImagePath } from "@/lib/og-params";
import { getPublicPage, getPublicPageResult } from "@/lib/public-page";
import { pagePrimaryColor } from "@/lib/theme-colors";

// The page's metadata, viewport colour and OG card live here, not in the root
// layout: only "/" needs the profile, so admin routes, /offline and 404s no
// longer wait on (or pay for) the public-page API call.

export async function generateViewport(): Promise<Viewport> {
	const data = await getPublicPage();
	return {
		width: "device-width",
		initialScale: 1,
		maximumScale: 5,
		// Browser chrome matches the page's primary colour (same as the manifest).
		themeColor: pagePrimaryColor(data?.settings, "#00ACED"),
	};
}

export async function generateMetadata(): Promise<Metadata> {
	const data = await getPublicPage();
	const settings = data?.settings;

	const title = settings?.seoTitle || "LinkDen";
	const description = settings?.seoDescription || "Your personal link-in-bio page";

	let ogImageUrl: string | undefined;
	if (settings?.seoOgMode === "template") {
		// Built with the route's own normaliser, so crawlers hit the canonical
		// /og URL directly instead of taking a 307 first.
		const siteOrigin = new URL(env.NEXT_PUBLIC_SITE_URL).origin;
		ogImageUrl = ogImagePath(
			ogContentFromPage(
				data,
				settings.seoOgTemplate || null,
				siteOrigin,
				ogAllowedOrigins(siteOrigin),
			),
		);
	} else if (settings?.seoOgImage) {
		ogImageUrl = settings.seoOgImage;
	}
	const images = ogImageUrl ? [{ url: ogImageUrl, width: 1200, height: 630, alt: title }] : [];

	return {
		title,
		description,
		...(settings?.brandingFaviconUrl
			? {
					icons: {
						icon: settings.brandingFaviconUrl,
						apple: settings.brandingFaviconUrl,
					},
				}
			: {}),
		openGraph: { title, description, ...(images.length ? { images } : {}) },
		twitter: {
			card: "summary_large_image",
			title,
			description,
			...(images.length ? { images } : {}),
		},
	};
}

// Server-rendered: the HTML already carries the hero + blocks (no spinner), and
// the color mode is resolved from the cookie so a returning visitor gets no
// flash. `cookies()` makes the route dynamic, which is what we want — the page
// must reflect the current DB on every request.
export default async function Home() {
	const result = await getPublicPageResult();
	// API unreachable: throw so app/error.tsx renders the retry card with a 500.
	// A 200 error page would be indexed by crawlers and would replace the
	// service worker's last good copy of "/" (it caches only 2xx).
	if (!result.ok) throw new Error("Public page data is unavailable");
	const data = result.data;
	// Not set up yet: the welcome page, not the error card.
	if (!data.profile) return <WelcomePage />;

	const [cookieStore, headerStore, blocks] = await Promise.all([
		cookies(),
		headers(),
		// Icons resolved here so the client ships no icon tables (lib/block-icons.ts).
		withResolvedIcons(data.blocks),
	]);
	const initialColorMode = resolveInitialColorMode({
		cookieMode: cookieStore.get(COLOR_MODE_COOKIE)?.value,
		systemHint: headerStore.get(COLOR_SCHEME_HINT_HEADER) ?? undefined,
		defaultColorMode: data.settings.defaultColorMode,
	});

	return (
		<>
			<ColorModeScript defaultColorMode={data.settings.defaultColorMode} />
			<PublicPage
				data={{ ...data, blocks, profile: data.profile }}
				initialColorMode={initialColorMode}
				maybeAdmin={hasSessionCookie(cookieStore)}
			/>
		</>
	);
}

import type { MetadataRoute } from "next";
import { getPublicPage } from "@/lib/public-page";

// Brand fallbacks — the same blue/navy as the default theme and the favicon.
const DEFAULT_THEME_COLOR = "#00ACED";
const DEFAULT_BACKGROUND_COLOR = "#091533";

/**
 * Public-page web app manifest (served at /manifest.webmanifest; Next links
 * it from the root layout automatically). Name and colours follow the site's
 * branding settings so "Add to Home Screen" installs *this* page, not LinkDen.
 * The admin panel has its own manifest at /admin/manifest.webmanifest.
 */
export default async function manifest(): Promise<MetadataRoute.Manifest> {
	const data = await getPublicPage();
	const name = data?.settings.brandingSiteName || data?.profile?.name || "LinkDen";
	return {
		id: "/",
		name,
		short_name: name.length > 12 ? name.slice(0, 12) : name,
		description: data?.settings.seoDescription || "Your personal link-in-bio page",
		start_url: "/",
		scope: "/",
		display: "standalone",
		theme_color: data?.settings.customPrimary || DEFAULT_THEME_COLOR,
		background_color: data?.settings.customBackground || DEFAULT_BACKGROUND_COLOR,
		icons: [
			{ src: "/favicon/web-app-manifest-192x192.png", sizes: "192x192", type: "image/png" },
			{ src: "/favicon/web-app-manifest-512x512.png", sizes: "512x512", type: "image/png" },
			{
				src: "/favicon/web-app-manifest-512x512.png",
				sizes: "512x512",
				type: "image/png",
				purpose: "maskable",
			},
		],
	};
}

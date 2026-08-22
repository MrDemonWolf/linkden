/**
 * Admin-panel web app manifest. Lives beside the public one (app/manifest.ts)
 * because a manifest's `scope` must contain its `start_url`: installing the
 * admin console from /admin gets this standalone "LinkDen Admin" app instead
 * of the visitor-facing page.
 */
export function GET() {
	return Response.json(
		{
			id: "/admin",
			name: "LinkDen Admin",
			short_name: "LinkDen",
			description: "LinkDen admin panel — manage your link-in-bio page",
			start_url: "/admin",
			scope: "/admin",
			display: "standalone",
			background_color: "#000000",
			theme_color: "#0a0a0a",
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
		},
		{
			headers: {
				"Content-Type": "application/manifest+json",
				"Cache-Control": "public, max-age=3600",
			},
		},
	);
}

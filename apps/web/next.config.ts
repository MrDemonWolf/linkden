import "@linkden/env/web";
import { readFileSync } from "node:fs";
import path from "node:path";
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";
import type { NextConfig } from "next";

// Single source of truth for the app version: root version.json
const { version } = JSON.parse(
	readFileSync(path.resolve(__dirname, "../../version.json"), "utf8"),
) as { version: string };

// Dev-only single-origin mode. Setting DEV_API_ORIGIN makes Next proxy the Hono
// API onto its own origin, so the whole app is reachable through ONE public
// origin (e.g. a `cloudflared tunnel --url http://localhost:3001` quick tunnel).
// Same-origin is what keeps auth working: the Better Auth cookie is SameSite=Lax
// (packages/auth/src/index.ts) and src/proxy.ts reads it from the web domain's
// own jar, so splitting web and API across hostnames breaks both.
const devApiOrigin = process.env.NODE_ENV !== "production" ? process.env.DEV_API_ORIGIN : undefined;

const nextConfig: NextConfig = {
	env: {
		NEXT_PUBLIC_APP_VERSION: version,
	},
	typedRoutes: true,
	reactCompiler: true,
	transpilePackages: ["@linkden/ui"],
	turbopack: {
		// Pin workspace root to the monorepo containing this app's bun.lock,
		// avoiding ambiguity when Claude Code worktrees create extra lockfiles.
		root: path.resolve(__dirname, "../.."),
	},
	// Dev-server-only. Plain asset GETs are same-origin and send no Origin header,
	// but the HMR WebSocket handshake does — without this it is rejected by Next's
	// cross-site dev guard and Fast Refresh dies behind a tunnel. Matched as a
	// hostname, so no scheme.
	allowedDevOrigins: ["*.trycloudflare.com"],
	async rewrites() {
		if (!devApiOrigin) return [];
		// afterFiles: Next's own filesystem routes are matched first, so
		// src/app/api/og/route.tsx keeps serving /api/og. Sources are enumerated
		// rather than a blanket /api/:path* so this stays correct if another Next
		// route handler is added under /api later.
		return {
			afterFiles: [
				{ source: "/trpc/:path*", destination: `${devApiOrigin}/trpc/:path*` },
				{
					source: "/api/auth/:path*",
					destination: `${devApiOrigin}/api/auth/:path*`,
				},
				{
					source: "/api/images/:path*",
					destination: `${devApiOrigin}/api/images/:path*`,
				},
				{ source: "/api/upload", destination: `${devApiOrigin}/api/upload` },
				{
					source: "/api/wallet-pass",
					destination: `${devApiOrigin}/api/wallet-pass`,
				},
				{ source: "/api/vcard", destination: `${devApiOrigin}/api/vcard` },
				{ source: "/api/health", destination: `${devApiOrigin}/api/health` },
			],
		};
	},
	async headers() {
		return [
			{
				// Apply security headers to all routes
				source: "/(.*)",
				headers: [
					{ key: "X-Content-Type-Options", value: "nosniff" },
					{ key: "X-Frame-Options", value: "DENY" },
					{ key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
					{
						key: "Permissions-Policy",
						value: "camera=(), microphone=(), geolocation=(), payment=()",
					},
					{
						key: "Content-Security-Policy",
						// frame-src * is intentional: link-in-bio blocks may embed YouTube, Spotify, etc.
						value:
							process.env.NODE_ENV === "production"
								? "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https:; frame-src *; connect-src 'self' https:; font-src 'self' data:; object-src 'none'; base-uri 'self';"
								: "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https:; frame-src *; connect-src 'self' https: http://localhost:*; font-src 'self' data:; object-src 'none'; base-uri 'self';",
					},
				],
			},
		];
	},
};

export default nextConfig;

initOpenNextCloudflareForDev();

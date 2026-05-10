import "@linkden/env/web";
import path from "node:path";
import type { NextConfig } from "next";

import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

const nextConfig: NextConfig = {
	typedRoutes: true,
	reactCompiler: true,
	transpilePackages: ["@linkden/ui"],
	turbopack: {
		// Pin workspace root to the monorepo containing this app's bun.lock,
		// avoiding ambiguity when Claude Code worktrees create extra lockfiles.
		root: path.resolve(__dirname, "../.."),
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

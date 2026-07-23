import "@linkden/env/web";
import { readFileSync } from "node:fs";
import path from "node:path";
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";
import type { NextConfig } from "next";

// Single source of truth for the app version: root version.json
const { version } = JSON.parse(
	readFileSync(path.resolve(__dirname, "../../version.json"), "utf8"),
) as { version: string };

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

import "@linkden/env/web";
import type { NextConfig } from "next";

import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

const nextConfig: NextConfig = {
  typedRoutes: true,
  reactCompiler: true,
  transpilePackages: ["@linkden/ui"],
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
          // TODO: Add Content-Security-Policy once inline styles and dynamic embeds are audited.
          // CSP is complex here because Tailwind may inject inline styles and embeds load
          // third-party iframes (YouTube, Spotify, SoundCloud) requiring frame-src exceptions.
        ],
      },
    ];
  },
};

export default nextConfig;

initOpenNextCloudflareForDev();

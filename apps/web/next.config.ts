import "@linkden/env/web";
import type { NextConfig } from "next";

import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

const nextConfig: NextConfig = {
  typedRoutes: true,
  reactCompiler: true,
  transpilePackages: ["@linkden/ui"],
};

export default nextConfig;

initOpenNextCloudflareForDev();

import { createMDX } from "fumadocs-mdx/next";
const withMDX = createMDX();
/** @type {import('next').NextConfig} */
const config = {
	output: "export",
	basePath: process.env.NEXT_PUBLIC_BASE_PATH || "",
	reactStrictMode: true,
	// Static export has no image optimizer; screenshots are pre-compressed WebP.
	images: { unoptimized: true },
};
export default withMDX(config);

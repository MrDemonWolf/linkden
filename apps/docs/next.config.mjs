import { createMDX } from "fumadocs-mdx/next";
const withMDX = createMDX();
/** @type {import('next').NextConfig} */
const config = {
  output: "export",
  basePath: process.env.NEXT_PUBLIC_BASE_PATH || "",
  reactStrictMode: true,
};
export default withMDX(config);

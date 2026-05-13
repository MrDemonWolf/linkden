import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
	plugins: [react()],
	test: {
		environment: "jsdom",
		setupFiles: ["./vitest.setup.ts"],
		include: ["**/__tests__/**/*.test.{ts,tsx}", "**/*.test.{ts,tsx}"],
		exclude: ["**/node_modules/**", "**/.next/**", "**/dist/**", "**/.wrangler/**"],
		coverage: {
			provider: "v8",
			reporter: ["text", "html", "lcov"],
			include: ["apps/**/src/**", "packages/**/src/**"],
			exclude: [
				"**/node_modules/**",
				"**/.next/**",
				"**/dist/**",
				"**/.wrangler/**",
				"**/migrations/**",
				"**/*.config.*",
				"**/*.test.{ts,tsx}",
				"**/__tests__/**",
			],
		},
	},
	resolve: {
		alias: {
			"@": path.resolve(__dirname, "apps/web/src"),
			"@linkden/validators": path.resolve(__dirname, "packages/validators/src"),
		},
	},
});

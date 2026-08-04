import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
	plugins: [react()],
	test: {
		environment: "jsdom",
		setupFiles: ["./vitest.setup.ts"],
		include: ["**/__tests__/**/*.test.{ts,tsx}", "**/*.test.{ts,tsx}"],
		// e2e/ is Playwright's — run via `bun run test:e2e`, never by Vitest.
		exclude: [
			"**/node_modules/**",
			"**/.next/**",
			"**/dist/**",
			"**/.wrangler/**",
			"e2e/**",
		],
		coverage: {
			provider: "v8",
			reporter: ["text", "html", "lcov"],
			// Scope coverage to the backend logic we unit-test. UI components and
			// Next/docs pages are exercised via the app, not the unit suite, so
			// including them would make the thresholds meaningless.
			include: [
				"packages/api/src/utils/**",
				"packages/api/src/routers/version.ts",
				"packages/validators/src/**",
				"packages/db/src/retention.ts",
				"packages/db/src/testing.ts",
				"packages/email/src/**",
				"apps/server/src/lib/**",
			],
			exclude: [
				"**/node_modules/**",
				"**/.next/**",
				"**/dist/**",
				"**/.wrangler/**",
				"**/migrations/**",
				"**/*.config.*",
				"**/*.test.{ts,tsx}",
				"**/__tests__/**",
				"**/index.ts",
			],
			// A ratchet floor to prevent regressions — raise as coverage grows.
			thresholds: {
				statements: 60,
				branches: 60,
				functions: 55,
				lines: 60,
			},
		},
	},
	resolve: {
		alias: {
			"@": path.resolve(__dirname, "apps/web/src"),
			"@linkden/validators": path.resolve(__dirname, "packages/validators/src"),
		},
	},
});

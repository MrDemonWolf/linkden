import path from "node:path";
import react from "@vitejs/plugin-react";
import { configDefaults, defineConfig } from "vitest/config";

export default defineConfig({
	plugins: [react()],
	test: {
		environment: "jsdom",
		setupFiles: ["./vitest.setup.ts"],
		include: ["**/__tests__/**/*.test.{ts,tsx}", "**/*.test.{ts,tsx}"],
		// e2e/ is Playwright's — run via `bun run test:e2e`, never by Vitest.
		// .claude/ holds agent worktrees (stale branch copies of the whole repo);
		// without this they would run alongside the real suite against the root
		// aliases and inflate or break the local run.
		exclude: [
			...configDefaults.exclude,
			"**/.claude/**",
			"**/.next/**",
			"**/.wrangler/**",
			"**/.alchemy/**",
			"e2e/**",
		],
		coverage: {
			provider: "v8",
			reporter: ["text", "html", "lcov"],
			// Scope coverage to the logic the unit/integration suite owns. UI
			// components and Next/docs pages are exercised via the app, not the
			// unit suite, so including them would make the thresholds meaningless.
			// The routers, the tRPC auth middleware (packages/api/src/index.ts), the
			// auth options, the edge proxy and web lib helpers are in scope because
			// that is where the CLAUDE.md invariants live.
			include: [
				"packages/api/src/index.ts",
				"packages/api/src/utils/**",
				"packages/api/src/routers/**",
				"packages/auth/src/auth-options.ts",
				"packages/auth/src/dev-login.ts",
				"packages/validators/src/**",
				"packages/db/src/retention.ts",
				"packages/db/src/testing.ts",
				"packages/email/src/**",
				"apps/server/src/lib/**",
				// The Worker entry: routes, middleware order and gates
				// (apps/server/src/__tests__/routes.test.ts).
				"apps/server/src/index.ts",
				"apps/web/src/proxy.ts",
				"apps/web/src/lib/**",
				// Pure halves of the ops tooling (the I/O halves need wrangler / Bun).
				"packages/infra/deploy-config.ts",
				"scripts/lib/reset-sql.ts",
			],
			exclude: [
				"**/node_modules/**",
				"**/.claude/**",
				"**/.next/**",
				"**/dist/**",
				"**/.wrangler/**",
				"**/migrations/**",
				"**/*.config.*",
				"**/*.test.{ts,tsx}",
				"**/__tests__/**",
				// Pure re-export barrels only — not every index.ts (the tRPC
				// middleware in packages/api/src/index.ts must stay measured).
				"packages/validators/src/index.ts",
				"packages/email/src/index.ts",
				"packages/api/src/routers/index.ts",
			],
			// A ratchet floor to prevent regressions — raise as coverage grows.
			// The global floor covers everything above; the per-glob floors pin the
			// modules that guard production invariants so one well-tested area
			// cannot hide another sliding to zero.
			thresholds: {
				statements: 60,
				branches: 60,
				functions: 55,
				lines: 60,
				"packages/api/src/utils/**": { statements: 85, branches: 75, functions: 85, lines: 85 },
				"packages/api/src/routers/**": { statements: 50, branches: 40, functions: 50, lines: 50 },
				"packages/validators/src/**": { statements: 85, branches: 80, functions: 85, lines: 85 },
				"apps/server/src/lib/**": { statements: 80, branches: 75, functions: 80, lines: 80 },
				"apps/server/src/lib/upload-validation.ts": {
					statements: 90,
					branches: 90,
					functions: 90,
					lines: 90,
				},
				"packages/db/src/retention.ts": { statements: 90, branches: 90, functions: 90, lines: 90 },
				"packages/infra/deploy-config.ts": {
					statements: 90,
					branches: 90,
					functions: 90,
					lines: 90,
				},
				"scripts/lib/reset-sql.ts": { statements: 90, branches: 90, functions: 90, lines: 90 },
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

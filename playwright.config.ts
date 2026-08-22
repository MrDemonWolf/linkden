import { defineConfig, devices } from "@playwright/test";

// E2E suite — deliberately split from Vitest. `bun run test` stays unit-only;
// run this with `bun run test:e2e`. Specs live in e2e/*.spec.ts, which the
// Vitest include (**/*.test.{ts,tsx}) never matches.
//
// Targets the running dev stack (web :3001 + wrangler :3000). If the servers
// are already up (normal on the devbox) they are reused; otherwise Playwright
// boots them and waits on the health endpoints.
const BASE_URL = process.env.PW_BASE_URL ?? "http://127.0.0.1:3001";

export default defineConfig({
	testDir: "./e2e",
	outputDir: "./e2e/.results",
	fullyParallel: true,
	forbidOnly: !!process.env.CI,
	retries: process.env.CI ? 2 : 0,
	reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
	use: {
		baseURL: BASE_URL,
		trace: "on-first-retry",
		screenshot: "only-on-failure",
	},
	projects: [
		// Both projects run on Chromium — the only browser installed on the
		// devbox. Pixel 7 (not an iPhone profile) because iPhone device presets
		// default to WebKit, which would demand a second browser download.
		{ name: "desktop", use: { ...devices["Desktop Chrome"] } },
		{ name: "mobile", use: { ...devices["Pixel 7"] } },
	],
	webServer: [
		{
			command: "bun dev:server",
			url: "http://127.0.0.1:3000/api/health",
			reuseExistingServer: true,
			timeout: 120_000,
		},
		{
			command: "bun dev:web",
			url: "http://127.0.0.1:3001",
			reuseExistingServer: true,
			timeout: 120_000,
		},
	],
});

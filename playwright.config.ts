import { defineConfig, devices } from "@playwright/test";

// E2E suite — deliberately split from Vitest. `bun run test` stays unit-only;
// run this with `bun run test:e2e`. Specs live in e2e/*.spec.ts, which the
// Vitest include (**/*.test.{ts,tsx}) never matches.
//
// Targets the running dev stack (web :3001 + wrangler :3000). If the servers
// are already up (normal on the devbox) they are reused; otherwise Playwright
// boots them and waits on the health endpoints.
// biome-ignore lint/suspicious/noUndeclaredEnvVars: Playwright runtime override, not a cached turbo task
const BASE_URL = process.env.PW_BASE_URL ?? "http://127.0.0.1:3001";
// biome-ignore lint/suspicious/noUndeclaredEnvVars: Playwright runtime override, not a cached turbo task
const API_URL = process.env.PW_API_URL ?? "http://127.0.0.1:3000";
const webUrl = new URL(BASE_URL);
const apiUrl = new URL(API_URL);
const webPort = webUrl.port || (webUrl.protocol === "https:" ? "443" : "80");
const apiPort = apiUrl.port || (apiUrl.protocol === "https:" ? "443" : "80");

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
			command: `bun run --cwd apps/server wrangler dev --ip 127.0.0.1 --port ${apiPort}`,
			url: `${API_URL}/api/health`,
			reuseExistingServer: true,
			timeout: 120_000,
		},
		{
			command: `bun run --cwd apps/web next dev --hostname 127.0.0.1 --port ${webPort}`,
			url: BASE_URL,
			env: {
				INTERNAL_SERVER_URL: API_URL,
				NEXT_PUBLIC_SERVER_URL: BASE_URL,
				NEXT_PUBLIC_SITE_URL: BASE_URL,
			},
			reuseExistingServer: true,
			timeout: 120_000,
		},
	],
});

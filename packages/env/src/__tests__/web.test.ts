import { afterEach, describe, expect, it, vi } from "vitest";

// The module validates at import time, so each case re-imports it fresh. The
// value is read inside (t3-env's proxy throws on any unknown key, including
// the `then` probe an async function performs on a returned object).
async function loadSiteUrl(vars: Record<string, string | undefined>) {
	vi.resetModules();
	vi.stubEnv("SKIP_ENV_VALIDATION", "");
	vi.stubEnv("NEXT_PUBLIC_SERVER_URL", "https://api.example.test");
	for (const [key, value] of Object.entries(vars)) vi.stubEnv(key, value ?? "");
	return (await import("../web")).env.NEXT_PUBLIC_SITE_URL;
}

describe("web env: NEXT_PUBLIC_SITE_URL", () => {
	afterEach(() => vi.unstubAllEnvs());

	it("defaults to localhost outside production", async () => {
		expect(await loadSiteUrl({ NODE_ENV: "development", NEXT_PUBLIC_SITE_URL: "" })).toBe(
			"http://localhost:3001",
		);
	});

	it("is required in production (an unset GitHub variable arrives as an empty string)", async () => {
		await expect(
			loadSiteUrl({ NODE_ENV: "production", NEXT_PUBLIC_SITE_URL: "" }),
		).rejects.toThrow();
	});

	it("accepts the real origin in production", async () => {
		expect(
			await loadSiteUrl({
				NODE_ENV: "production",
				NEXT_PUBLIC_SITE_URL: "https://links.example.test",
			}),
		).toBe("https://links.example.test");
	});
});

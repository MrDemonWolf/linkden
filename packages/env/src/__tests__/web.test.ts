import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it, vi } from "vitest";

// The module validates at import time, so each case re-imports it fresh.
async function loadEnv(vars: Record<string, string | undefined>) {
	vi.resetModules();
	vi.stubEnv("SKIP_ENV_VALIDATION", "");
	vi.stubEnv("NEXT_PUBLIC_SERVER_URL", "https://api.example.test");
	for (const [key, value] of Object.entries(vars)) vi.stubEnv(key, value ?? "");
	return (await import("../web")).env;
}

async function loadSiteUrl(vars: Record<string, string | undefined>) {
	return (await loadEnv(vars)).NEXT_PUBLIC_SITE_URL;
}

describe("web env: NEXT_PUBLIC_SITE_URL", () => {
	afterEach(() => vi.unstubAllEnvs());

	it("defaults to localhost outside production", async () => {
		expect(await loadSiteUrl({ NODE_ENV: "development", NEXT_PUBLIC_SITE_URL: "" })).toBe(
			"http://localhost:3001",
		);
	});

	it("is required in production (an unset GitHub variable arrives as an empty string)", async () => {
		await expect(loadSiteUrl({ NODE_ENV: "production", NEXT_PUBLIC_SITE_URL: "" })).rejects.toThrow(
			/NEXT_PUBLIC_SITE_URL/,
		);
	});

	it("accepts the real origin in production", async () => {
		expect(
			await loadSiteUrl({
				NODE_ENV: "production",
				NEXT_PUBLIC_SITE_URL: "https://links.example.test",
			}),
		).toBe("https://links.example.test");
	});

	it("rejects a value that is not a URL", async () => {
		await expect(
			loadSiteUrl({ NODE_ENV: "development", NEXT_PUBLIC_SITE_URL: "links.example.test" }),
		).rejects.toThrow(/NEXT_PUBLIC_SITE_URL/);
	});
});

describe("web env: NEXT_PUBLIC_SERVER_URL", () => {
	afterEach(() => vi.unstubAllEnvs());

	it("is required", async () => {
		await expect(loadEnv({ NEXT_PUBLIC_SERVER_URL: "" })).rejects.toThrow(/NEXT_PUBLIC_SERVER_URL/);
	});

	it("must be a URL", async () => {
		await expect(loadEnv({ NEXT_PUBLIC_SERVER_URL: "not a url" })).rejects.toThrow(
			/NEXT_PUBLIC_SERVER_URL/,
		);
	});

	it("can be skipped for CI builds (SKIP_ENV_VALIDATION)", async () => {
		vi.resetModules();
		vi.stubEnv("SKIP_ENV_VALIDATION", "1");
		vi.stubEnv("NEXT_PUBLIC_SERVER_URL", "");
		const { env } = await import("../web");
		expect(env.NEXT_PUBLIC_SERVER_URL).toBeUndefined();
	});
});

describe("web env: client bundle weight", () => {
	// Every route imports this module in the browser; a schema library here
	// ships to every page load.
	it("does not import zod or t3-env", () => {
		const source = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "../web.ts"), "utf8");
		expect(source).not.toMatch(/from\s+["'](zod|@t3-oss\/[^"']+)["']/);
	});
});

// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@linkden/env/web", () => ({}));
vi.mock("@opennextjs/cloudflare", () => ({ initOpenNextCloudflareForDev: vi.fn() }));
afterEach(() => {
	vi.unstubAllEnvs();
	vi.resetModules();
});

async function rewrites(mode: string, apiOrigin = "http://127.0.0.1:13000") {
	vi.stubEnv("NODE_ENV", mode);
	vi.stubEnv("DEV_API_ORIGIN", apiOrigin);
	vi.stubEnv("LINKDEN_SERVING_MODE", "legacy");
	vi.resetModules();
	const config = (await import("../../../next.config")).default;
	return config.rewrites?.();
}

describe("explicit development API rewrites", () => {
	it("runs enumerated API rewrites before filesystem handlers while leaving OG to Next", async () => {
		const routes = await rewrites("development");
		expect(routes).toHaveProperty("beforeFiles");
		if (!routes || Array.isArray(routes) || !routes.beforeFiles)
			throw new Error("Missing development rewrites");
		expect(routes.beforeFiles.map((rule) => rule.source)).toEqual([
			"/trpc/:path*",
			"/api/auth/:path*",
			"/api/images/:path*",
			"/api/upload",
			"/api/admin/wallet-pass",
			"/api/vcard",
			"/api/health",
		]);
		expect(
			routes.beforeFiles.every((rule) => rule.destination.startsWith("http://127.0.0.1:13000/")),
		).toBe(true);
		expect(routes.beforeFiles.some((rule) => rule.source === "/og")).toBe(false);
	});

	it.each(["production", "test", ""])("has no development proxy in %j", async (mode) => {
		expect(await rewrites(mode)).toEqual([]);
	});
	it("keeps the normal binding bridge when no development override is configured", async () => {
		expect(await rewrites("development", "")).toEqual([]);
	});
});

import { beforeAll, describe, expect, it } from "vitest";

const SITE_URL = "https://links.example.test";

// The env module validates at import time, so the vars must be set first.
beforeAll(() => {
	process.env.NEXT_PUBLIC_SERVER_URL = "https://api.example.test";
	process.env.NEXT_PUBLIC_SITE_URL = SITE_URL;
});

describe("sitemap + robots", () => {
	it("sitemap uses NEXT_PUBLIC_SITE_URL as the only entry", async () => {
		const { default: sitemap } = await import("../sitemap");
		const entries = sitemap();
		expect(entries).toHaveLength(1);
		expect(entries[0]?.url).toBe(SITE_URL);
		expect(JSON.stringify(entries)).not.toContain("example.com");
	});

	it("robots points at an absolute sitemap under the site origin", async () => {
		const { default: robots } = await import("../robots");
		const result = robots();
		expect(result.sitemap).toBe(`${SITE_URL}/sitemap.xml`);
		expect(JSON.stringify(result)).not.toContain("example.com");
	});
});

import { afterEach, describe, expect, it, vi } from "vitest";
import { isLocalDevelopmentUrl, localHttpOrigin, localHttpUrl } from "../local-development";

afterEach(() => vi.unstubAllEnvs());

describe("local development UI", () => {
	it.each(["http://localhost:3001", "http://127.0.0.1:3001", "http://[::1]:3001"])(
		"allows a local development page: %s",
		(url) => {
			vi.stubEnv("NODE_ENV", "development");
			expect(isLocalDevelopmentUrl(url)).toBe(true);
		},
	);
	it.each([
		"https://localhost:3001",
		"http://192.168.1.10:3001",
		"https://preview.example.com",
		"http://localhost.example.com",
		"http://localhost@evil.example",
		"http://user@localhost:3001",
		"http://2130706433:3001",
		"http://127.1:3001",
		"http://%6cocalhost:3001",
		"http://localhost.:3001",
		"invalid",
	])("hides development controls outside local HTTP: %s", (url) => {
		vi.stubEnv("NODE_ENV", "development");
		expect(isLocalDevelopmentUrl(url)).toBe(false);
	});
	it.each(["production", "test", ""])("fails closed in %s even with the public flag", (mode) => {
		vi.stubEnv("NODE_ENV", mode);
		vi.stubEnv("NEXT_PUBLIC_DEV_LOGIN", "true");
		expect(isLocalDevelopmentUrl("http://localhost:3001")).toBe(false);
	});
});

describe("shared loopback URL parsing", () => {
	it("accepts local request paths while requiring a bare transport origin", () => {
		expect(localHttpUrl("http://localhost:3001/admin/login?from=page")?.pathname).toBe(
			"/admin/login",
		);
		expect(localHttpOrigin("http://localhost:13000/")?.origin).toBe("http://localhost:13000");
		for (const suffix of ["/admin", "/path/..", "?query=1", "#fragment", "//"])
			expect(localHttpOrigin(`http://localhost:13000${suffix}`)).toBeNull();
	});
});

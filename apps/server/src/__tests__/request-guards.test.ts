// @vitest-environment node
import { describe, expect, it } from "vitest";
import { allowedOrigin, isTrustedRequestOrigin } from "../lib/origin";

describe("allowedOrigin", () => {
	it("normalizes CORS_ORIGIN to scheme://host[:port]", () => {
		expect(allowedOrigin("https://links.example.com/")).toBe("https://links.example.com");
		expect(allowedOrigin(undefined)).toBe("http://localhost:3001");
	});
});

describe("isTrustedRequestOrigin", () => {
	const base = {
		allowed: "https://links.example.com",
		self: "https://links.example.com",
		origin: undefined,
		secFetchSite: undefined,
	};

	it("accepts the site origin and rejects a same-site sibling", () => {
		expect(isTrustedRequestOrigin({ ...base, origin: "https://links.example.com" })).toBe(true);
		expect(isTrustedRequestOrigin({ ...base, origin: "https://evil.example.com" })).toBe(false);
		expect(isTrustedRequestOrigin({ ...base, origin: "null" })).toBe(false);
	});

	it("accepts the request's own origin (API on its own host)", () => {
		expect(
			isTrustedRequestOrigin({
				...base,
				self: "https://api.example.com",
				origin: "https://api.example.com",
			}),
		).toBe(true);
	});

	it("falls back to Sec-Fetch-Site when Origin is absent", () => {
		expect(isTrustedRequestOrigin({ ...base, secFetchSite: "same-origin" })).toBe(true);
		expect(isTrustedRequestOrigin({ ...base, secFetchSite: "same-site" })).toBe(false);
		expect(isTrustedRequestOrigin({ ...base, secFetchSite: "cross-site" })).toBe(false);
	});

	it("lets non-browser callers (no Origin, no Sec-Fetch-*) through", () => {
		expect(isTrustedRequestOrigin(base)).toBe(true);
	});
});

import { describe, expect, it } from "vitest";
import {
	canonicalOgSearch,
	normalizeOgAvatar,
	normalizeOgParams,
	ogRateLimitKey,
} from "../og-params";

describe("OG image parameters", () => {
	it("preserves valid public-page values", () => {
		const result = normalizeOgParams(
			new URLSearchParams({
				template: "profile",
				name: "Nathan",
				bio: "Web developer",
				theme: "#0FACED",
			}),
		);

		expect(result).toEqual({
			template: "profile",
			name: "Nathan",
			bio: "Web developer",
			theme: "#0faced",
		});
	});

	it("bounds untrusted values and canonicalizes the cache identity", () => {
		const input = new URLSearchParams({
			template: "attacker-template",
			name: `  ${"n".repeat(100)}  `,
			bio: "b".repeat(600),
			theme: "url(https://attacker.test)",
			_preview: "anything",
			ignored: "unique-cache-key",
		});
		const result = normalizeOgParams(input);

		expect(result.template).toBe("minimal");
		expect(result.name).toHaveLength(100);
		expect(result.bio).toHaveLength(300);
		expect(result.theme).toBe("#6366f1");
		expect(canonicalOgSearch(result, "")).toBe(
			`template=minimal&name=${"n".repeat(100)}&bio=${"b".repeat(300)}&theme=%236366f1`,
		);
	});

	it("uses only Cloudflare's trusted client address for rate limiting", () => {
		expect(ogRateLimitKey(new Headers({ "cf-connecting-ip": "192.0.2.1" }))).toBe("192.0.2.1");
		expect(ogRateLimitKey(new Headers({ "x-forwarded-for": "198.51.100.8" }))).toBe("");
	});

	it("accepts only canonical uploaded-image avatar URLs", () => {
		const origins = new Set(["https://linkden.test", "https://api.linkden.test"]);
		expect(
			normalizeOgAvatar(
				"https://api.linkden.test/api/images/avatar/id.png?nonce=1#fragment",
				"https://linkden.test",
				origins,
			),
		).toBe("https://api.linkden.test/api/images/avatar/id.png");
		expect(normalizeOgAvatar("/og?avatar=recursive", "https://linkden.test", origins)).toBe("");
		expect(
			normalizeOgAvatar("https://attacker.test/api/images/id.png", "https://linkden.test", origins),
		).toBe("");
	});
});

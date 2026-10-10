import { describe, expect, it } from "vitest";
import {
	canonicalOgSearch,
	normalizeOgAvatar,
	normalizeOgParams,
	ogAllowedOrigins,
	ogContentFromPage,
	ogImagePath,
	ogRateLimitKey,
	ogThemeColor,
} from "../og-params";

/** What the /og route does with a request's query: normalise, then re-serialise. */
function routeCanonical(path: string): string {
	const search = new URL(path, "https://linkden.test").searchParams;
	const params = normalizeOgParams(search);
	const avatar =
		params.template === "profile"
			? normalizeOgAvatar(search.get("avatar"), "https://linkden.test", ORIGINS)
			: "";
	return canonicalOgSearch(params, avatar);
}
const ORIGINS = new Set(["https://linkden.test", "https://api.linkden.test"]);

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

describe("generateMetadata's og:image URL", () => {
	const page = {
		profile: { name: "Nathan", bio: "Hi", image: "/api/images/avatar/id.png" },
		settings: { customPrimary: "#0FACED", seoOgTemplate: "profile" },
	};

	it("is already canonical, so crawlers never take a 307 first", () => {
		const path = ogImagePath(ogContentFromPage(page, null, "https://linkden.test", ORIGINS));
		expect(path.startsWith("/og?")).toBe(true);
		expect(path.slice("/og?".length)).toBe(routeCanonical(path));
		// Uppercase stored colour and relative avatar are canonicalised up front.
		expect(path).toContain("theme=%230faced");
		expect(path).toContain(encodeURIComponent("https://linkden.test/api/images/avatar/id.png"));
	});

	it("leaves the avatar out of templates that don't draw it", () => {
		const content = ogContentFromPage(page, "minimal", "https://linkden.test", ORIGINS);
		expect(content.avatar).toBe("");
		expect(ogImagePath(content)).not.toContain("avatar=");
	});

	it("falls back to defaults when the page is unavailable", () => {
		const content = ogContentFromPage(null, null, "https://linkden.test", ORIGINS);
		expect(content.params).toMatchObject({ name: "My Links", bio: "", theme: "#6366f1" });
	});

	it("stays canonical when the cut lands on a space or inside an emoji", () => {
		for (const name of [`${"a".repeat(99)} b`, `${"a".repeat(99)}😀`]) {
			const path = ogImagePath(
				ogContentFromPage(
					{ ...page, profile: { ...page.profile, name } },
					"minimal",
					"https://linkden.test",
					ORIGINS,
				),
			);
			expect(path.slice("/og?".length)).toBe(routeCanonical(path));
		}
	});
});

describe("ogAllowedOrigins", () => {
	it("keeps only absolute origins", () => {
		const origins = ogAllowedOrigins("https://linkden.test/some/path", "not a url", null);
		expect(origins.has("https://linkden.test")).toBe(true);
		expect([...origins].every((o) => /^https?:\/\//.test(o))).toBe(true);
	});
});

describe("ogThemeColor", () => {
	it("uses the custom primary, else the active preset's light primary, else the default", () => {
		expect(ogThemeColor({ customPrimary: "#123456", themePreset: "ocean-blue" })).toBe("#123456");
		expect(ogThemeColor({ customPrimary: null, themePreset: "default" })).toBe("#091533");
		expect(ogThemeColor({ customPrimary: "", themePreset: "no-such-preset" })).toBe("#6366f1");
		expect(ogThemeColor(null)).toBe("#6366f1");
	});
});

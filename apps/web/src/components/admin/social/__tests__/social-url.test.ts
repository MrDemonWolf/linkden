import { describe, expect, it } from "vitest";
import { buildSocialUrl, extractSocialHandle, handleFromUrl } from "../social-url";

const X = "https://x.com/{}";
const TIKTOK = "https://tiktok.com/@{}";
const INSTAGRAM = "https://instagram.com/{}";
const TUMBLR = "https://{}.tumblr.com";
// biome-ignore lint/suspicious/noTemplateCurlyInString: literal placeholder token, not interpolation
const CASH = "https://cash.app/${}";

describe("buildSocialUrl", () => {
	it("puts a typed handle into the template", () => {
		expect(buildSocialUrl("ada", X)).toBe("https://x.com/ada");
		expect(buildSocialUrl("  ada  ", X)).toBe("https://x.com/ada");
		expect(buildSocialUrl("ada", TUMBLR)).toBe("https://ada.tumblr.com");
	});

	it("never nests a pasted profile URL inside the template", () => {
		expect(buildSocialUrl("https://x.com/ada", X)).toBe("https://x.com/ada");
		expect(buildSocialUrl("http://www.x.com/ada/", X)).toBe("https://x.com/ada");
		expect(buildSocialUrl("https://www.instagram.com/ada", INSTAGRAM)).toBe(
			"https://instagram.com/ada",
		);
		expect(buildSocialUrl("https://ada.tumblr.com/", TUMBLR)).toBe("https://ada.tumblr.com");
	});

	it("keeps a pasted URL from another host as-is", () => {
		expect(buildSocialUrl("https://twitter.com/ada", X)).toBe("https://twitter.com/ada");
	});

	it("drops a leading @ (and the template's own sigil) from a handle", () => {
		expect(buildSocialUrl("@ada", TIKTOK)).toBe("https://tiktok.com/@ada");
		expect(buildSocialUrl("@ada", X)).toBe("https://x.com/ada");
		expect(buildSocialUrl("$ada", CASH)).toBe("https://cash.app/$ada");
		expect(buildSocialUrl("@", TIKTOK)).toBe("");
	});

	it("returns empty for an empty box and passes full-URL templates through", () => {
		expect(buildSocialUrl("", X)).toBe("");
		expect(buildSocialUrl(" https://example.com ", "{}")).toBe("https://example.com");
	});

	it("does not treat $ in a handle as a replacement pattern", () => {
		expect(buildSocialUrl("a$&b", X)).toBe("https://x.com/a$&b");
	});
});

describe("extractSocialHandle", () => {
	it("shows the handle for the canonical and the variant spellings", () => {
		expect(extractSocialHandle("https://x.com/ada", X)).toBe("ada");
		expect(extractSocialHandle("https://www.instagram.com/ada", INSTAGRAM)).toBe("ada");
		expect(extractSocialHandle("http://Instagram.com/ada/", INSTAGRAM)).toBe("ada");
		expect(extractSocialHandle("https://www.tiktok.com/@ada", TIKTOK)).toBe("ada");
		expect(extractSocialHandle("https://ada.tumblr.com/", TUMBLR)).toBe("ada");
	});

	it("round-trips a handle that is still being typed", () => {
		expect(extractSocialHandle(buildSocialUrl("12345/", X), X)).toBe("12345/");
		expect(extractSocialHandle(buildSocialUrl("https:/", X), X)).toBe("https:/");
	});

	it("shows a foreign or double-prefixed URL whole instead of hiding it", () => {
		expect(extractSocialHandle("https://twitter.com/ada", X)).toBe("https://twitter.com/ada");
		expect(extractSocialHandle("https://x.com/https://x.com/ada", X)).toBe(
			"https://x.com/https://x.com/ada",
		);
		expect(handleFromUrl("https://x.com/", X)).toBeNull();
	});
});

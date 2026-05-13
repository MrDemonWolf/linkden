import { describe, expect, it } from "vitest";
import { sanitizeUrl, stripHtml, truncateUserAgent } from "../utils/sanitize";

describe("sanitizeUrl", () => {
	it("returns empty for empty input", () => {
		expect(sanitizeUrl("")).toBe("");
	});

	it("accepts http", () => {
		expect(sanitizeUrl("http://example.com")).toBe("http://example.com");
	});

	it("accepts https", () => {
		expect(sanitizeUrl("https://example.com/x")).toBe("https://example.com/x");
	});

	it("rejects javascript: scheme", () => {
		expect(sanitizeUrl("javascript:alert(1)")).toBe("");
	});

	it("rejects data: scheme", () => {
		expect(sanitizeUrl("data:text/html,<script>alert(1)</script>")).toBe("");
	});

	it("rejects file: scheme", () => {
		expect(sanitizeUrl("file:///etc/passwd")).toBe("");
	});

	it("rejects unparseable input", () => {
		expect(sanitizeUrl("not a url")).toBe("");
	});
});

describe("stripHtml", () => {
	it("strips basic tags", () => {
		expect(stripHtml("<b>hi</b>")).toBe("hi");
	});

	it("strips script tag wrapper, keeps inner text", () => {
		expect(stripHtml("<script>alert(1)</script>safe")).toBe("alert(1)safe");
	});

	it("decodes entity-encoded tags and strips them", () => {
		expect(stripHtml("&lt;b&gt;hi&lt;/b&gt;ok")).toBe("hiok");
	});

	it("decodes numeric entities", () => {
		expect(stripHtml("&#60;b&#62;hi&#60;/b&#62;")).toBe("hi");
	});

	it("decodes hex entities", () => {
		expect(stripHtml("&#x3C;b&#x3E;hi&#x3C;/b&#x3E;")).toBe("hi");
	});

	it("leaves plain text untouched", () => {
		expect(stripHtml("hello world")).toBe("hello world");
	});
});

describe("truncateUserAgent", () => {
	it("returns null for empty input", () => {
		expect(truncateUserAgent(undefined)).toBeNull();
		expect(truncateUserAgent("")).toBeNull();
	});

	it("recognises Chrome", () => {
		expect(
			truncateUserAgent(
				"Mozilla/5.0 (Windows NT 10.0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
			),
		).toBe("Chrome/120");
	});

	it("recognises Firefox", () => {
		expect(
			truncateUserAgent("Mozilla/5.0 (X11; Linux x86_64; rv:121.0) Gecko/20100101 Firefox/121.0"),
		).toBe("Firefox/121");
	});

	it("recognises Edge as Edge", () => {
		expect(truncateUserAgent("Mozilla/5.0 Edg/120.0.0.0")).toBe("Edge/120");
	});

	it("recognises Opera (OPR)", () => {
		expect(truncateUserAgent("Mozilla/5.0 OPR/105.0.0.0")).toBe("Opera/105");
	});

	it("returns Other for unknown UA", () => {
		expect(truncateUserAgent("CustomBot/1.0")).toBe("Other");
	});
});

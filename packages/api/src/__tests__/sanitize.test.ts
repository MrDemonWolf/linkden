import { describe, expect, it } from "vitest";
import { sanitizeUrl, stripHtml } from "../utils/sanitize";

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

	it("strips tags with attributes and self-closing slash syntax", () => {
		expect(stripHtml('a<img src=x onerror="alert(1)">b<svg/onload=alert(1)>c<br/>d')).toBe("abcd");
	});

	it("cannot be bypassed by a tag split around another tag", () => {
		expect(stripHtml("<scr<b>ipt>alert(1)</script>")).toBe("alert(1)");
	});

	it("keeps an email address in angle brackets", () => {
		expect(stripHtml("Please reply to my work address <jane@corp.com> rather than this one")).toBe(
			"Please reply to my work address <jane@corp.com> rather than this one",
		);
	});

	it("keeps comparisons and hearts", () => {
		expect(stripHtml("if x < 5 and y > 3 then")).toBe("if x < 5 and y > 3 then");
		expect(stripHtml("love you <3")).toBe("love you <3");
	});

	it("does not decode entities a visitor typed", () => {
		expect(stripHtml("&lt;3 and &lt;b&gt;")).toBe("&lt;3 and &lt;b&gt;");
	});

	it("leaves plain text untouched", () => {
		expect(stripHtml("hello world")).toBe("hello world");
	});
});

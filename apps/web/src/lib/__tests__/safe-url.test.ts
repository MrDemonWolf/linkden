import { describe, expect, it } from "vitest";
import { safeHttpUrl, safeImageSrc } from "../safe-url";

describe("safeHttpUrl", () => {
	it("keeps http(s) and drops everything else", () => {
		expect(safeHttpUrl("https://a.test/x")).toBe("https://a.test/x");
		expect(safeHttpUrl("javascript:alert(1)")).toBeNull();
		expect(safeHttpUrl("/api/images/avatar/x.png")).toBeNull();
	});
});

describe("safeImageSrc", () => {
	it("keeps uploaded image paths and external http(s) images", () => {
		expect(safeImageSrc("/api/images/block_image/abc-123.webp")).toBe(
			"/api/images/block_image/abc-123.webp",
		);
		expect(safeImageSrc("https://cdn.test/pic.png")).toBe("https://cdn.test/pic.png");
	});

	it("reduces a legacy absolute upload URL to its path", () => {
		expect(safeImageSrc("https://linkden-api.me.workers.dev/api/images/avatar/abc.png")).toBe(
			"/api/images/avatar/abc.png",
		);
	});

	it("drops unsafe or non-image relative values", () => {
		expect(safeImageSrc("javascript:alert(1)")).toBeNull();
		expect(safeImageSrc("/etc/passwd")).toBeNull();
		expect(safeImageSrc(42)).toBeNull();
	});
});

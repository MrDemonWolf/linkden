import { describe, expect, it } from "vitest";
import { extractImageKeys } from "../lib/image-keys";

describe("extractImageKeys", () => {
	it("pulls R2 keys out of /api/images/ URLs", () => {
		const keys = extractImageKeys([
			"https://api.example.com/api/images/avatar/abc-123.png",
			"/api/images/banner/def-456.webp",
			'{"logo":"/api/images/wallet_logo/ghi.png","x":1}',
		]);
		expect(keys).toEqual(
			new Set(["avatar/abc-123.png", "banner/def-456.webp", "wallet_logo/ghi.png"]),
		);
	});

	it("ignores unrelated URLs and empty strings", () => {
		expect(extractImageKeys(["", "https://example.com/logo.png", "no urls here"]).size).toBe(0);
	});
});

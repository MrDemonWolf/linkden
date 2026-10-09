import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { getGravatarUrl, md5Hex } from "../gravatar";

describe("md5Hex", () => {
	// RFC 1321 test suite.
	it.each([
		["", "d41d8cd98f00b204e9800998ecf8427e"],
		["a", "0cc175b9c0f1b6a831c399e269772661"],
		["abc", "900150983cd24fb0d6963f7d28e17f72"],
		["message digest", "f96b697d7cb7938d525a2f31aaf161d0"],
		[
			"12345678901234567890123456789012345678901234567890123456789012345678901234567890",
			"57edf4a22be3c955ac49da2e2107b67a",
		],
	])("md5(%j)", (input, expected) => {
		expect(md5Hex(input)).toBe(expected);
	});

	it("matches node:crypto across block boundaries and multi-byte input", () => {
		for (const input of ["x".repeat(55), "x".repeat(56), "x".repeat(64), "ünïcödé ✉️ 名前"]) {
			expect(md5Hex(input)).toBe(createHash("md5").update(input, "utf8").digest("hex"));
		}
	});
});

describe("getGravatarUrl", () => {
	it("hashes the trimmed, lower-cased address", () => {
		expect(getGravatarUrl("  Admin@Example.COM ", 56)).toBe(
			`https://www.gravatar.com/avatar/${md5Hex("admin@example.com")}?s=56&d=404`,
		);
	});
});

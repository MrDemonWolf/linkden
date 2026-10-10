import { describe, expect, it, vi } from "vitest";

// sanitizeSetting is pure; routers/settings.ts only needs the D1 client to load.
vi.mock("@linkden/db", () => ({ db: {} }));

const { sanitizeSetting } = await import("../settings");

describe("sanitizeSetting: timezone", () => {
	it("accepts IANA aliases the workerd supportedValuesOf list leaves out", () => {
		for (const tz of [
			"UTC",
			"Asia/Kolkata",
			"Europe/Kyiv",
			"America/Argentina/Buenos_Aires",
			"America/New_York",
		]) {
			expect(sanitizeSetting("timezone", tz)).toBe(tz);
		}
		expect(sanitizeSetting("timezone", "")).toBe("");
	});

	it("rejects zones the formatter can't construct", () => {
		expect(() => sanitizeSetting("timezone", "Not/AZone")).toThrow(/Invalid timezone/);
	});
});

describe("sanitizeSetting: opaque keys are structurally validated", () => {
	it("consent_categories must be the three boolean flags", () => {
		const ok = '{"analytics":true,"marketing":false,"functional":false}';
		expect(sanitizeSetting("consent_categories", ok)).toBe(ok);
		for (const bad of ["null", "", "{}"]) {
			expect(() => sanitizeSetting("consent_categories", bad), bad).toThrow(/Invalid value/);
		}
	});

	it("wallet_relevant_date must be ISO or blank", () => {
		expect(sanitizeSetting("wallet_relevant_date", "2026-10-07T18:00:00.000Z")).toBe(
			"2026-10-07T18:00:00.000Z",
		);
		expect(() => sanitizeSetting("wallet_relevant_date", "next friday")).toThrow();
	});

	it("wallet_locations rejects out-of-range coordinates", () => {
		expect(() =>
			sanitizeSetting("wallet_locations", '[{"latitude":1e999,"longitude":0}]'),
		).toThrow();
	});

	it("unvalidated opaque keys still pass through verbatim", () => {
		expect(sanitizeSetting("theme", '{"anything":1}')).toBe('{"anything":1}');
	});
});

describe("sanitizeSetting: unknown keys", () => {
	it("rejects Object.prototype names instead of treating them as registered", () => {
		for (const key of ["constructor", "__proto__", "toString", "hasOwnProperty"]) {
			expect(() => sanitizeSetting(key, "x"), key).toThrow(/Unknown setting/);
		}
	});
});

describe("sanitizeSetting: apiKey", () => {
	it("refuses a value carrying the secret mask (a mask glued to a pasted key)", () => {
		expect(() => sanitizeSetting("email_api_key", "re_live_abc••••••")).toThrow(/Invalid value/);
		expect(() => sanitizeSetting("email_api_key", "••••••")).toThrow(/Invalid value/);
		expect(sanitizeSetting("email_api_key", "re_live_abc")).toBe("re_live_abc");
	});
});

describe("sanitizeSetting: site_language", () => {
	it("accepts BCP-47 tags and blank, rejects anything else", () => {
		for (const tag of ["", "en", "pt-BR", "zh-Hant-TW", "es-419"]) {
			expect(sanitizeSetting("site_language", tag), tag).toBe(tag);
		}
		for (const bad of ["english", "e", "en_US", "<script>", "en-"]) {
			expect(() => sanitizeSetting("site_language", bad), bad).toThrow(/Invalid value/);
		}
	});
});

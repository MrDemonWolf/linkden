import { describe, expect, it } from "vitest";
import { DEFAULT_CONSENT_CATEGORIES, parseConsentCategories } from "../consent";

describe("parseConsentCategories", () => {
	it("returns the stored flags when the shape is right", () => {
		expect(
			parseConsentCategories('{"analytics":false,"marketing":true,"functional":true}'),
		).toEqual({ analytics: false, marketing: true, functional: true });
	});

	it("falls back to the defaults for blank, null, bad JSON or a wrong shape", () => {
		for (const bad of [null, undefined, "", "null", "{nope", "[]", '{"analytics":"yes"}']) {
			expect(parseConsentCategories(bad), String(bad)).toEqual(DEFAULT_CONSENT_CATEGORIES);
		}
	});
});

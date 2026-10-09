import { describe, expect, it } from "vitest";
import {
	DEFAULT_CONSENT_CATEGORIES,
	parseConsentCategories,
	serializeConsentCategories,
} from "../consent-categories";

describe("consent categories", () => {
	it.each([undefined, null, "", "{bad", "null", "[]", "42", '"text"'])(
		"falls back to the defaults for %s instead of throwing",
		(raw) => {
			expect(parseConsentCategories(raw)).toEqual(DEFAULT_CONSENT_CATEGORIES);
		},
	);

	it("keeps valid booleans and defaults the fields that aren't", () => {
		expect(
			parseConsentCategories('{"analytics":false,"marketing":"yes","functional":true}'),
		).toEqual({
			analytics: false,
			marketing: false,
			functional: true,
		});
	});

	it("round-trips to canonical JSON so toggling back is clean", () => {
		const raw = '{"functional":true,"analytics":false,"marketing":true}';
		const once = serializeConsentCategories(parseConsentCategories(raw));
		expect(once).toBe('{"analytics":false,"marketing":true,"functional":true}');
		expect(serializeConsentCategories(parseConsentCategories(once))).toBe(once);
	});
});

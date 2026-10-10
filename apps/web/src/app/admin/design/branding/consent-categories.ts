import {
	type ConsentCategoriesConfig,
	DEFAULT_CONSENT_CATEGORIES,
	parseConsentCategories,
} from "@linkden/validators/consent";

// `consent_categories` can hold anything a restored backup carried, so the form
// reads it with the shared lenient parser (never throws, per-flag defaults).
export type ConsentCategories = ConsentCategoriesConfig;
export { DEFAULT_CONSENT_CATEGORIES, parseConsentCategories };

/** Canonical JSON (fixed key order), so toggling a box back reads as clean again. */
export function serializeConsentCategories(c: ConsentCategories): string {
	return JSON.stringify({
		analytics: c.analytics,
		marketing: c.marketing,
		functional: c.functional,
	});
}

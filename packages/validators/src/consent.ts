// ─── Consent banner categories ──────────────────────────────────────────────
// Shape of the `consent_categories` setting: which optional cookie categories
// the banner offers. Readers use parseConsentCategories so a bad stored value
// falls back to the defaults instead of crashing the public page or the
// Branding form. The write-side zod schema lives in ./consent-schema: this
// module is zod-free because the public page's consent banner imports it.

export interface ConsentCategoriesConfig {
	analytics: boolean;
	marketing: boolean;
	functional: boolean;
}

export const CONSENT_CATEGORY_KEYS = ["analytics", "marketing", "functional"] as const;

export const DEFAULT_CONSENT_CATEGORIES: ConsentCategoriesConfig = {
	analytics: true,
	marketing: false,
	functional: false,
};

/**
 * Lenient read of a stored consent_categories value: never throws. Each flag is
 * taken only when it is a real boolean; anything else (and "", null, bad JSON,
 * an array or a primitive) falls back to the default for that flag.
 */
export function parseConsentCategories(json: string | null | undefined): ConsentCategoriesConfig {
	if (!json) return { ...DEFAULT_CONSENT_CATEGORIES };
	let value: unknown;
	try {
		value = JSON.parse(json);
	} catch {
		return { ...DEFAULT_CONSENT_CATEGORIES };
	}
	if (!value || typeof value !== "object" || Array.isArray(value)) {
		return { ...DEFAULT_CONSENT_CATEGORIES };
	}
	const v = value as Record<string, unknown>;
	const pick = (key: (typeof CONSENT_CATEGORY_KEYS)[number]) =>
		typeof v[key] === "boolean" ? (v[key] as boolean) : DEFAULT_CONSENT_CATEGORIES[key];
	return {
		analytics: pick("analytics"),
		marketing: pick("marketing"),
		functional: pick("functional"),
	};
}

import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getThemeColors } from "@/lib/theme-colors";
import {
	CONSENT_MAX_AGE_MS,
	CONSENT_VERSION,
	ConsentBanner,
	hasAnalyticsConsent,
	hasConsent,
	onConsentChange,
	openConsentPreferences,
	parseStoredConsent,
} from "../consent-banner";

const KEY = "linkden-consent";
const NOW = 1_800_000_000_000;
const theme = getThemeColors("default", "light");

function renderBanner(consentCategories: string | null = null) {
	return render(
		<ConsentBanner
			settings={{
				consentBannerEnabled: true,
				consentBannerText: null,
				consentPrivacyUrl: null,
				consentCategories,
			}}
			themeColors={theme}
		/>,
	);
}

describe("parseStoredConsent", () => {
	it("treats nothing stored as no consent", () => {
		expect(parseStoredConsent(null)).toBeNull();
		expect(parseStoredConsent("{not json")).toBeNull();
	});

	it("honours legacy values but asks again", () => {
		expect(parseStoredConsent("accepted")).toMatchObject({
			choices: { analytics: true },
			current: false,
		});
		expect(parseStoredConsent("declined")).toMatchObject({
			choices: { analytics: false },
			current: false,
		});
		expect(parseStoredConsent('{"analytics":true}')?.current).toBe(false);
	});

	it("is current only for a dated choice under this version", () => {
		const stored = JSON.stringify({ analytics: true, v: CONSENT_VERSION, ts: NOW });
		expect(parseStoredConsent(stored, NOW)).toMatchObject({
			choices: { essential: true, analytics: true, functional: false },
			current: true,
		});
		const older = JSON.stringify({ analytics: true, v: CONSENT_VERSION - 1, ts: NOW });
		expect(parseStoredConsent(older, NOW)?.current).toBe(false);
	});

	it("expires a choice older than the maximum age (it then grants nothing)", () => {
		const stored = JSON.stringify({ analytics: true, v: CONSENT_VERSION, ts: NOW });
		expect(parseStoredConsent(stored, NOW + CONSENT_MAX_AGE_MS + 1)).toBeNull();
	});
});

describe("hasConsent", () => {
	beforeEach(() => localStorage.clear());

	it("grants nothing before the visitor chooses while the banner is on", () => {
		expect(hasAnalyticsConsent(true)).toBe(false);
		expect(hasConsent("functional", true)).toBe(false);
	});

	it("has no gate when the banner is off and nothing is stored", () => {
		expect(hasAnalyticsConsent(false)).toBe(true);
	});

	it("reads each category separately", () => {
		localStorage.setItem(
			KEY,
			JSON.stringify({ analytics: false, functional: true, v: CONSENT_VERSION, ts: Date.now() }),
		);
		expect(hasAnalyticsConsent(true)).toBe(false);
		expect(hasConsent("functional", true)).toBe(true);
	});
});

describe("ConsentBanner", () => {
	beforeEach(() => localStorage.clear());
	afterEach(cleanup);

	it("records a dated choice and tells the page (first-visit page view)", () => {
		const listener = vi.fn();
		const off = onConsentChange(listener);
		renderBanner();
		fireEvent.click(screen.getByRole("button", { name: "Accept All" }));
		off();

		expect(listener).toHaveBeenCalledWith(expect.objectContaining({ analytics: true }));
		const stored = JSON.parse(localStorage.getItem(KEY) ?? "{}");
		expect(stored).toMatchObject({ analytics: true, marketing: false, v: CONSENT_VERSION });
		expect(typeof stored.ts).toBe("number");
		expect(screen.queryByRole("region", { name: "Cookie consent" })).toBeNull();
	});

	it("reopens from the footer link so consent can be withdrawn", () => {
		localStorage.setItem(
			KEY,
			JSON.stringify({ analytics: true, v: CONSENT_VERSION, ts: Date.now() }),
		);
		renderBanner('{"analytics":true,"functional":true}');
		expect(screen.queryByRole("region", { name: "Cookie consent" })).toBeNull();

		act(() => openConsentPreferences());
		expect((screen.getByRole("checkbox", { name: /analytics/i }) as HTMLInputElement).checked).toBe(
			true,
		);
		fireEvent.click(screen.getByRole("button", { name: "Essential Only" }));
		expect(hasAnalyticsConsent(true)).toBe(false);
	});

	it("offers no marketing category (nothing on the page uses it)", () => {
		renderBanner('{"analytics":true,"marketing":true,"functional":true}');
		fireEvent.click(screen.getByRole("button", { name: "Manage Preferences" }));
		expect(screen.queryByText("Marketing")).toBeNull();
		expect(screen.getByText("Embedded media")).toBeTruthy();
	});

	it("gives accept and reject the same visual weight", () => {
		renderBanner('{"analytics":true}');
		const accept = screen.getByRole("button", { name: "Accept All" });
		const reject = screen.getByRole("button", { name: "Essential Only" });
		expect(reject.className).toBe(accept.className);
		expect(reject.getAttribute("style")).toBe(accept.getAttribute("style"));
	});

	it("Escape hides it for this view without recording a choice", () => {
		renderBanner();
		fireEvent.keyDown(window, { key: "Escape" });
		expect(screen.queryByRole("region", { name: "Cookie consent" })).toBeNull();
		expect(localStorage.getItem(KEY)).toBeNull();
	});

	it("reserves room for itself while it shows and releases it after", () => {
		const { unmount } = renderBanner();
		expect(document.documentElement.style.getPropertyValue("--ld-consent-h")).toMatch(/px$/);
		unmount();
		expect(document.documentElement.style.getPropertyValue("--ld-consent-h")).toBe("");
		expect(document.documentElement.style.scrollPaddingBottom).toBe("");
	});
});

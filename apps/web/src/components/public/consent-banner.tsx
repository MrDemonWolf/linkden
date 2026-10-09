"use client";

import { getReadableTextColor } from "@linkden/ui/color-contrast";
import { parseConsentCategories } from "@linkden/validators/consent";
import { useEffect, useRef, useState } from "react";
import { PrivacyNoticeLink, resolvePrivacyNotice } from "./privacy-notice";
import type { ThemeColors } from "./public-page";

const CONSENT_KEY = "linkden-consent";
/**
 * Bump when the categories or what they gate change: every stored choice from
 * an older version is asked again (it still counts until the visitor answers).
 */
export const CONSENT_VERSION = 2;
/** A choice older than this is treated as absent and asked again (~12 months). */
export const CONSENT_MAX_AGE_MS = 365 * 24 * 60 * 60 * 1000;

const CONSENT_CHANGE_EVENT = "linkden:consent";
const CONSENT_OPEN_EVENT = "linkden:consent-open";

export interface ConsentCategories {
	essential: boolean;
	analytics: boolean;
	marketing: boolean;
	functional: boolean;
}

type ConsentCategory = Exclude<keyof ConsentCategories, "essential">;

const DEFAULT_CONSENT: ConsentCategories = {
	essential: true,
	analytics: false,
	marketing: false,
	functional: false,
};

// Whether the admin has the banner switched on lives here as a module
// flag (set by <ConsentBanner/> on render) so trackClick callers deep in the
// block tree don't need `settings.consentBannerEnabled` threaded to them.
let consentBannerEnabled = true;

interface StoredConsentRecord {
	choices: ConsentCategories;
	/** False for legacy values and older versions: honoured, but asked again. */
	current: boolean;
}

/**
 * Parse the stored choice. Returns null when nothing usable is stored or the
 * choice has expired (it then grants nothing). Legacy values — the
 * "accepted"/"declined" strings and the unversioned JSON — still count, but
 * are not `current`, so the banner asks again to record a dated choice.
 */
export function parseStoredConsent(
	stored: string | null,
	now: number = Date.now(),
): StoredConsentRecord | null {
	if (!stored) return null;
	if (stored === "accepted")
		return { choices: { ...DEFAULT_CONSENT, analytics: true }, current: false };
	if (stored === "declined") return { choices: DEFAULT_CONSENT, current: false };
	try {
		const parsed = JSON.parse(stored) as Partial<ConsentCategories> & { v?: number; ts?: number };
		if (!parsed || typeof parsed !== "object") return null;
		const choices: ConsentCategories = {
			essential: true,
			analytics: parsed.analytics === true,
			marketing: parsed.marketing === true,
			functional: parsed.functional === true,
		};
		if (typeof parsed.ts === "number" && now - parsed.ts > CONSENT_MAX_AGE_MS) return null;
		return {
			choices,
			current: parsed.v === CONSENT_VERSION && typeof parsed.ts === "number",
		};
	} catch {
		return null;
	}
}

function readStoredConsent(): StoredConsentRecord | null {
	try {
		return parseStoredConsent(localStorage.getItem(CONSENT_KEY));
	} catch {
		return null;
	}
}

/**
 * True if the visitor allowed `category`, or the admin disabled the banner (no
 * consent gate) and nothing was stored. False during SSR and in restricted
 * storage contexts.
 */
export function hasConsent(
	category: ConsentCategory,
	bannerEnabled: boolean = consentBannerEnabled,
): boolean {
	if (typeof window === "undefined") return false;
	const record = readStoredConsent();
	if (!record) return !bannerEnabled;
	return record.choices[category] === true;
}

/** Analytics gate for page views and link clicks (see `hasConsent`). */
export function hasAnalyticsConsent(bannerEnabled: boolean = consentBannerEnabled): boolean {
	return hasConsent("analytics", bannerEnabled);
}

/** Subscribe to consent being saved on this page; returns the unsubscribe. */
export function onConsentChange(listener: (consent: ConsentCategories) => void): () => void {
	const handler = (e: Event) => listener((e as CustomEvent<ConsentCategories>).detail);
	window.addEventListener(CONSENT_CHANGE_EVENT, handler);
	return () => window.removeEventListener(CONSENT_CHANGE_EVENT, handler);
}

/** Reopen the banner on its preferences, e.g. from the footer "Cookie settings" link. */
export function openConsentPreferences(): void {
	window.dispatchEvent(new Event(CONSENT_OPEN_EVENT));
}

interface ConsentSettings {
	consentBannerEnabled: boolean;
	consentBannerText: string | null;
	consentPrivacyUrl: string | null;
	/** Text-mode privacy policy, shown in a dialog when there is no URL. */
	consentPrivacyText?: string | null;
	consentCategories: string | null; // JSON: { analytics: bool, marketing: bool, functional: bool }
}

interface ConsentBannerProps {
	settings?: ConsentSettings;
	/** Resolved page theme — the banner is styled inline from it so a light-preset
	 * page never renders a navy cookie bar from global .dark tokens. */
	themeColors: ThemeColors;
	colorMode?: "light" | "dark";
}

interface EnabledCategories {
	analytics: boolean;
	functional: boolean;
}

/**
 * The categories the banner offers. "marketing" is never offered: nothing on
 * the page uses it, and asking for consent that gates nothing is misleading.
 * Embeds ride on "functional". A bad stored value falls back to the defaults.
 */
function enabledCategories(json: string | null): EnabledCategories {
	const { analytics, functional } = parseConsentCategories(json);
	return { analytics, functional };
}

/** Keeps the page clear of the fixed banner while it shows (WCAG 2.4.11). */
function useReserveBannerSpace(ref: React.RefObject<HTMLElement | null>, visible: boolean) {
	useEffect(() => {
		const el = ref.current;
		if (!visible || !el) return;
		const root = document.documentElement;
		const apply = () => {
			const h = `${Math.ceil(el.getBoundingClientRect().height)}px`;
			root.style.setProperty("--ld-consent-h", h);
			root.style.scrollPaddingBottom = h;
		};
		apply();
		const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(apply) : null;
		ro?.observe(el);
		return () => {
			ro?.disconnect();
			root.style.removeProperty("--ld-consent-h");
			root.style.scrollPaddingBottom = "";
		};
	}, [ref, visible]);
}

export function ConsentBanner({ settings, themeColors }: ConsentBannerProps) {
	consentBannerEnabled = settings?.consentBannerEnabled !== false;
	const bannerOn = settings?.consentBannerEnabled !== false;
	const [visible, setVisible] = useState(false);
	const [showPreferences, setShowPreferences] = useState(false);
	const [selections, setSelections] = useState<ConsentCategories>(DEFAULT_CONSENT);
	const sectionRef = useRef<HTMLElement>(null);

	const enabled = enabledCategories(settings?.consentCategories ?? null);
	const privacyNotice = resolvePrivacyNotice(
		settings?.consentPrivacyUrl,
		settings?.consentPrivacyText,
	);
	const hasCategories = enabled.analytics || enabled.functional;

	useEffect(() => {
		if (!bannerOn) return;
		// Ask when nothing current is stored: first visit, an expired choice, or
		// one recorded under an older consent version.
		const record = readStoredConsent();
		if (!record?.current) setVisible(true);
		if (record) setSelections(record.choices);
		// Footer "Cookie settings": reopen with the current choices pre-filled,
		// so changing or withdrawing consent is as easy as giving it.
		const open = () => {
			const latest = readStoredConsent();
			if (latest) setSelections(latest.choices);
			setShowPreferences(true);
			setVisible(true);
		};
		window.addEventListener(CONSENT_OPEN_EVENT, open);
		return () => window.removeEventListener(CONSENT_OPEN_EVENT, open);
	}, [bannerOn]);

	// Escape hides the banner for this page view without recording a choice
	// (nothing is granted) — a way out when it covers what has focus.
	useEffect(() => {
		if (!visible) return;
		const onKey = (e: KeyboardEvent) => {
			if (e.key !== "Escape" || e.defaultPrevented) return;
			// Leave Escape to an open dialog (the contact modal, the QR code).
			if (document.querySelector('[role="dialog"]')) return;
			const hadFocus = sectionRef.current?.contains(document.activeElement);
			setVisible(false);
			if (hadFocus) document.getElementById("main-content")?.focus();
		};
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	}, [visible]);

	useReserveBannerSpace(sectionRef, bannerOn && visible);

	// If banner disabled in admin, never show
	if (!bannerOn) return null;
	if (!visible) return null;

	const bannerText =
		settings?.consentBannerText ||
		"This site uses cookies for authentication and optional analytics to understand visitor behaviour. You can accept or decline analytics tracking.";

	const saveConsent = (consent: ConsentCategories) => {
		const choices: ConsentCategories = { ...consent, essential: true, marketing: false };
		try {
			localStorage.setItem(
				CONSENT_KEY,
				JSON.stringify({ ...choices, v: CONSENT_VERSION, ts: Date.now() }),
			);
		} catch {
			/* restricted context */
		}
		setSelections(choices);
		setVisible(false);
		setShowPreferences(false);
		window.dispatchEvent(new CustomEvent(CONSENT_CHANGE_EVENT, { detail: choices }));
	};

	const acceptAll = () => {
		saveConsent({
			essential: true,
			analytics: enabled.analytics,
			marketing: false,
			functional: enabled.functional,
		});
	};

	const acceptSelected = () => {
		saveConsent({ ...selections, essential: true });
	};

	// Also the withdrawal path: it overwrites any earlier grant.
	const essentialOnly = () => {
		saveConsent(DEFAULT_CONSENT);
	};

	// Inline theme styling from the resolved page palette — the banner is a fixed
	// element outside `.ld-page`, so it can't read the `--ld-*` vars set there and
	// must never fall back to admin tokens. Text sits on the card surface, so it
	// uses the card foreground (fg is only guaranteed against the page bg).
	const containerStyle: React.CSSProperties = {
		backgroundColor: themeColors.card,
		borderColor: themeColors.border,
		color: themeColors.cardFg,
	};
	const bodyTextStyle: React.CSSProperties = { color: themeColors.mutedFg };
	const linkStyle: React.CSSProperties = { color: themeColors.primary };
	// Accept and reject carry the same visual weight (same fill, size and
	// padding) so neither is the "default" a visitor is nudged towards.
	const choiceBtnStyle: React.CSSProperties = {
		backgroundColor: themeColors.primary,
		color: getReadableTextColor(themeColors.primary),
	};
	const choiceBtnClass =
		"min-h-11 rounded-lg px-4 py-2 text-small font-medium transition-[filter] hover:brightness-110";
	const secondaryBtnStyle: React.CSSProperties = {
		borderColor: themeColors.border,
		color: themeColors.cardFg,
	};
	const panelStyle: React.CSSProperties = {
		backgroundColor: themeColors.muted,
		borderColor: themeColors.border,
	};
	const checkboxStyle: React.CSSProperties = { accentColor: themeColors.primary };
	// Hex-alpha concat only works on #RRGGBB values; anything else (an
	// unsanitized import, rgb() string) falls back to the untinted color.
	const primaryIsHex6 = /^#[0-9a-fA-F]{6}$/.test(themeColors.primary);
	const tintedBtnStyle: React.CSSProperties = {
		color: themeColors.primary,
		borderColor: primaryIsHex6 ? `${themeColors.primary}4D` : themeColors.border,
		backgroundColor: primaryIsHex6 ? `${themeColors.primary}1A` : themeColors.muted,
	};

	// A non-modal <section> (implicit role="region"), not role="dialog": the banner
	// must not trap focus or block the page — visitors can ignore it and keep using
	// the links, and a dialog's focus trap would be a keyboard/screen-reader snare.
	if (!hasCategories) {
		return (
			<section
				ref={sectionRef}
				aria-label="Cookie consent"
				className="fixed bottom-0 left-0 right-0 z-50 flex flex-col gap-3 border-t p-4 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-lg sm:flex-row sm:items-center sm:justify-between"
				style={containerStyle}
			>
				<div className="min-w-0 flex-1">
					<p className="text-small" style={bodyTextStyle}>
						{bannerText}
					</p>
					{privacyNotice && (
						<PrivacyNoticeLink
							notice={privacyNotice}
							themeColors={themeColors}
							className="mt-1 inline-block text-small hover:underline"
							style={linkStyle}
						>
							Privacy Policy
						</PrivacyNoticeLink>
					)}
				</div>
				<div className="flex shrink-0 flex-wrap gap-2">
					<button
						type="button"
						onClick={essentialOnly}
						className={choiceBtnClass}
						style={choiceBtnStyle}
					>
						Decline
					</button>
					<button
						type="button"
						onClick={acceptAll}
						className={choiceBtnClass}
						style={choiceBtnStyle}
					>
						Accept
					</button>
				</div>
			</section>
		);
	}

	return (
		<section
			ref={sectionRef}
			aria-label="Cookie consent"
			className="fixed bottom-0 left-0 right-0 z-50 max-h-[70dvh] overflow-y-auto border-t p-4 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-lg"
			style={containerStyle}
		>
			<div className="mx-auto max-w-3xl space-y-3">
				<div>
					<p className="text-small" style={bodyTextStyle}>
						{bannerText}
					</p>
					{privacyNotice && (
						<PrivacyNoticeLink
							notice={privacyNotice}
							themeColors={themeColors}
							className="mt-1 inline-block text-small hover:underline"
							style={linkStyle}
						>
							Privacy Policy
						</PrivacyNoticeLink>
					)}
				</div>

				{showPreferences && (
					<div className="space-y-2 rounded-lg border p-3" style={panelStyle}>
						{/* Essential — always on */}
						<label className="flex items-center gap-2 text-small">
							<input
								type="checkbox"
								checked
								disabled
								className="h-3.5 w-3.5 rounded"
								style={checkboxStyle}
							/>
							<span className="font-medium">Essential</span>
							<span className="text-small" style={bodyTextStyle}>
								— Required for authentication and core features
							</span>
						</label>

						{enabled.analytics && (
							<label className="flex items-center gap-2 text-small">
								<input
									type="checkbox"
									checked={selections.analytics}
									onChange={(e) => setSelections((s) => ({ ...s, analytics: e.target.checked }))}
									className="h-3.5 w-3.5 rounded"
									style={checkboxStyle}
								/>
								<span className="font-medium">Analytics</span>
								<span className="text-small" style={bodyTextStyle}>
									— Counts page views and link clicks
								</span>
							</label>
						)}

						{enabled.functional && (
							<label className="flex items-center gap-2 text-small">
								<input
									type="checkbox"
									checked={selections.functional}
									onChange={(e) =>
										setSelections((s) => ({
											...s,
											functional: e.target.checked,
										}))
									}
									className="h-3.5 w-3.5 rounded"
									style={checkboxStyle}
								/>
								<span className="font-medium">Embedded media</span>
								<span className="text-small" style={bodyTextStyle}>
									— Loads videos and music from third parties (YouTube, Spotify…)
								</span>
							</label>
						)}
					</div>
				)}

				<div className="flex flex-wrap items-center gap-2">
					<button
						type="button"
						onClick={() => setShowPreferences(!showPreferences)}
						aria-expanded={showPreferences}
						className="min-h-11 rounded-lg border px-4 py-2 text-small font-medium transition-opacity hover:opacity-80"
						style={secondaryBtnStyle}
					>
						{showPreferences ? "Hide Preferences" : "Manage Preferences"}
					</button>
					{showPreferences && (
						<button
							type="button"
							onClick={acceptSelected}
							className="min-h-11 rounded-lg border px-4 py-2 text-small font-medium transition-[filter] hover:brightness-110"
							style={tintedBtnStyle}
						>
							Accept Selected
						</button>
					)}
					<button
						type="button"
						onClick={essentialOnly}
						className={choiceBtnClass}
						style={choiceBtnStyle}
					>
						Essential Only
					</button>
					<button
						type="button"
						onClick={acceptAll}
						className={choiceBtnClass}
						style={choiceBtnStyle}
					>
						Accept All
					</button>
				</div>
			</div>
		</section>
	);
}

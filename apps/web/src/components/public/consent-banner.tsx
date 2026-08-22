"use client";

import { getReadableTextColor } from "@linkden/ui/color-contrast";
import { useEffect, useState } from "react";
import type { ThemeColors } from "./public-page";

const CONSENT_KEY = "linkden-consent";

export interface ConsentCategories {
	essential: boolean;
	analytics: boolean;
	marketing: boolean;
	functional: boolean;
}

const DEFAULT_CONSENT: ConsentCategories = {
	essential: true,
	analytics: false,
	marketing: false,
	functional: false,
};

// ponytail: whether the admin has the banner switched on lives here as a module
// flag (set by <ConsentBanner/> on render) so trackClick callers deep in the
// block tree don't need `settings.consentBannerEnabled` threaded to them.
let consentBannerEnabled = true;

/**
 * Returns true if analytics may be recorded: the visitor accepted analytics,
 * or the admin disabled the banner (no consent gate) and nothing was stored.
 * Reads from localStorage; returns false in SSR contexts.
 * Backward-compatible: handles both legacy "accepted"/"declined" and new JSON format.
 */
export function hasAnalyticsConsent(bannerEnabled = consentBannerEnabled): boolean {
	if (typeof window === "undefined") return false;
	try {
		const stored = localStorage.getItem(CONSENT_KEY);
		if (!stored) return !bannerEnabled;
		// Legacy format
		if (stored === "accepted") return true;
		if (stored === "declined") return false;
		// New JSON format
		const parsed = JSON.parse(stored) as ConsentCategories;
		return parsed.analytics === true;
	} catch {
		return false;
	}
}

/** Get full consent state */
export function getConsent(): ConsentCategories {
	if (typeof window === "undefined") return DEFAULT_CONSENT;
	try {
		const stored = localStorage.getItem(CONSENT_KEY);
		if (!stored) return DEFAULT_CONSENT;
		if (stored === "accepted")
			return { essential: true, analytics: true, marketing: true, functional: true };
		if (stored === "declined") return { ...DEFAULT_CONSENT };
		return JSON.parse(stored) as ConsentCategories;
	} catch {
		return DEFAULT_CONSENT;
	}
}

interface ConsentSettings {
	consentBannerEnabled: boolean;
	consentBannerText: string | null;
	consentPrivacyUrl: string | null;
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
	marketing: boolean;
	functional: boolean;
}

function parseEnabledCategories(json: string | null): EnabledCategories {
	if (!json) return { analytics: true, marketing: false, functional: false };
	try {
		return JSON.parse(json) as EnabledCategories;
	} catch {
		return { analytics: true, marketing: false, functional: false };
	}
}

export function ConsentBanner({ settings, themeColors }: ConsentBannerProps) {
	consentBannerEnabled = settings?.consentBannerEnabled !== false;
	const [visible, setVisible] = useState(false);
	const [showPreferences, setShowPreferences] = useState(false);
	const [selections, setSelections] = useState<ConsentCategories>({
		essential: true,
		analytics: false,
		marketing: false,
		functional: false,
	});

	const enabled = parseEnabledCategories(settings?.consentCategories ?? null);

	useEffect(() => {
		try {
			const stored = localStorage.getItem(CONSENT_KEY);
			if (!stored) setVisible(true);
		} catch {
			// Restricted context
		}
	}, []);

	// If banner disabled in admin, never show
	if (settings && !settings.consentBannerEnabled) return null;
	if (!visible) return null;

	const bannerText =
		settings?.consentBannerText ||
		"This site uses cookies for authentication and optional analytics to understand visitor behaviour. You can accept or decline analytics tracking.";

	const saveConsent = (consent: ConsentCategories) => {
		try {
			localStorage.setItem(CONSENT_KEY, JSON.stringify(consent));
		} catch {
			/* restricted context */
		}
		setVisible(false);
	};

	const acceptAll = () => {
		saveConsent({
			essential: true,
			analytics: enabled.analytics,
			marketing: enabled.marketing,
			functional: enabled.functional,
		});
	};

	const acceptSelected = () => {
		saveConsent({ ...selections, essential: true });
	};

	const essentialOnly = () => {
		saveConsent(DEFAULT_CONSENT);
	};

	// Simple mode — no categories configured, just accept/decline
	const hasCategories = enabled.analytics || enabled.marketing || enabled.functional;

	// Inline theme styling from the resolved page palette — the banner is a fixed
	// element outside `.ld-page`, so it can't read the `--ld-*` vars set there and
	// must never fall back to admin tokens.
	const containerStyle: React.CSSProperties = {
		backgroundColor: themeColors.card,
		borderColor: themeColors.border,
		color: themeColors.fg,
	};
	const bodyTextStyle: React.CSSProperties = { color: themeColors.mutedFg };
	const linkStyle: React.CSSProperties = { color: themeColors.primary };
	const primaryBtnStyle: React.CSSProperties = {
		backgroundColor: themeColors.primary,
		color: getReadableTextColor(themeColors.primary),
	};
	const secondaryBtnStyle: React.CSSProperties = {
		borderColor: themeColors.border,
		color: themeColors.fg,
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
				aria-label="Cookie consent"
				className="fixed bottom-0 left-0 right-0 z-50 flex flex-col gap-3 border-t p-4 shadow-lg sm:flex-row sm:items-center sm:justify-between"
				style={containerStyle}
			>
				<div className="min-w-0 flex-1">
					<p className="text-small" style={bodyTextStyle}>
						{bannerText}
					</p>
					{settings?.consentPrivacyUrl && (
						<a
							href={settings.consentPrivacyUrl}
							target="_blank"
							rel="noopener noreferrer"
							className="mt-1 inline-block text-small hover:underline"
							style={linkStyle}
						>
							Privacy Policy
						</a>
					)}
				</div>
				<div className="flex shrink-0 gap-2">
					<button
						type="button"
						onClick={essentialOnly}
						className="min-h-11 rounded-lg border px-4 py-2 text-small font-medium transition-opacity hover:opacity-80"
						style={secondaryBtnStyle}
					>
						Decline
					</button>
					<button
						type="button"
						onClick={acceptAll}
						className="min-h-11 rounded-lg px-4 py-2 text-small font-medium transition-[filter] hover:brightness-110"
						style={primaryBtnStyle}
					>
						Accept
					</button>
				</div>
			</section>
		);
	}

	return (
		<section
			aria-label="Cookie consent"
			className="fixed bottom-0 left-0 right-0 z-50 border-t p-4 shadow-lg"
			style={containerStyle}
		>
			<div className="mx-auto max-w-3xl space-y-3">
				<div>
					<p className="text-small" style={bodyTextStyle}>
						{bannerText}
					</p>
					{settings?.consentPrivacyUrl && (
						<a
							href={settings.consentPrivacyUrl}
							target="_blank"
							rel="noopener noreferrer"
							className="mt-1 inline-block text-small hover:underline"
							style={linkStyle}
						>
							Privacy Policy
						</a>
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
									— Helps understand visitor behaviour
								</span>
							</label>
						)}

						{enabled.marketing && (
							<label className="flex items-center gap-2 text-small">
								<input
									type="checkbox"
									checked={selections.marketing}
									onChange={(e) => setSelections((s) => ({ ...s, marketing: e.target.checked }))}
									className="h-3.5 w-3.5 rounded"
									style={checkboxStyle}
								/>
								<span className="font-medium">Marketing</span>
								<span className="text-small" style={bodyTextStyle}>
									— Personalized content and recommendations
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
								<span className="font-medium">Functional</span>
								<span className="text-small" style={bodyTextStyle}>
									— Enhanced features like themes and preferences
								</span>
							</label>
						)}
					</div>
				)}

				<div className="flex flex-wrap items-center gap-2">
					<button
						type="button"
						onClick={() => setShowPreferences(!showPreferences)}
						className="min-h-11 rounded-lg border px-3 py-2 text-small font-medium transition-opacity hover:opacity-80"
						style={secondaryBtnStyle}
					>
						{showPreferences ? "Hide Preferences" : "Manage Preferences"}
					</button>
					{showPreferences && (
						<button
							type="button"
							onClick={acceptSelected}
							className="min-h-11 rounded-lg border px-3 py-2 text-small font-medium transition-[filter] hover:brightness-110"
							style={tintedBtnStyle}
						>
							Accept Selected
						</button>
					)}
					<button
						type="button"
						onClick={essentialOnly}
						className="min-h-11 rounded-lg border px-3 py-2 text-small font-medium transition-opacity hover:opacity-80"
						style={secondaryBtnStyle}
					>
						Essential Only
					</button>
					<button
						type="button"
						onClick={acceptAll}
						className="min-h-11 rounded-lg px-4 py-2 text-small font-medium transition-[filter] hover:brightness-110"
						style={primaryBtnStyle}
					>
						Accept All
					</button>
				</div>
			</div>
		</section>
	);
}

"use client";

import { useState, useEffect } from "react";

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

/**
 * Returns true if the visitor has accepted analytics tracking.
 * Reads from localStorage; returns false in SSR contexts.
 * Backward-compatible: handles both legacy "accepted"/"declined" and new JSON format.
 */
export function hasAnalyticsConsent(): boolean {
	if (typeof window === "undefined") return false;
	try {
		const stored = localStorage.getItem(CONSENT_KEY);
		if (!stored) return false;
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
		if (stored === "accepted") return { essential: true, analytics: true, marketing: true, functional: true };
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

export function ConsentBanner({ settings }: ConsentBannerProps) {
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

	if (!hasCategories) {
		return (
			<div
				role="dialog"
				aria-label="Cookie and analytics consent"
				className="fixed bottom-0 left-0 right-0 z-50 flex flex-col gap-3 border-t bg-background/95 p-4 shadow-lg backdrop-blur-md sm:flex-row sm:items-center sm:justify-between"
			>
				<div className="min-w-0 flex-1">
					<p className="text-sm text-muted-foreground">{bannerText}</p>
					{settings?.consentPrivacyUrl && (
						<a
							href={settings.consentPrivacyUrl}
							target="_blank"
							rel="noopener noreferrer"
							className="mt-1 inline-block text-xs text-primary hover:underline"
						>
							Privacy Policy
						</a>
					)}
				</div>
				<div className="flex shrink-0 gap-2">
					<button
						type="button"
						onClick={essentialOnly}
						className="rounded-lg border px-4 py-2 text-sm font-medium transition-colors hover:bg-muted"
					>
						Decline
					</button>
					<button
						type="button"
						onClick={acceptAll}
						className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:brightness-110"
					>
						Accept
					</button>
				</div>
			</div>
		);
	}

	return (
		<div
			role="dialog"
			aria-label="Cookie and analytics consent"
			className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background/95 p-4 shadow-lg backdrop-blur-md"
		>
			<div className="mx-auto max-w-3xl space-y-3">
				<div>
					<p className="text-sm text-muted-foreground">{bannerText}</p>
					{settings?.consentPrivacyUrl && (
						<a
							href={settings.consentPrivacyUrl}
							target="_blank"
							rel="noopener noreferrer"
							className="mt-1 inline-block text-xs text-primary hover:underline"
						>
							Privacy Policy
						</a>
					)}
				</div>

				{showPreferences && (
					<div className="space-y-2 rounded-lg border border-border/50 bg-muted/30 p-3">
						{/* Essential — always on */}
						<label className="flex items-center gap-2 text-sm">
							<input
								type="checkbox"
								checked
								disabled
								className="h-3.5 w-3.5 rounded accent-primary"
							/>
							<span className="font-medium">Essential</span>
							<span className="text-xs text-muted-foreground">
								— Required for authentication and core features
							</span>
						</label>

						{enabled.analytics && (
							<label className="flex items-center gap-2 text-sm">
								<input
									type="checkbox"
									checked={selections.analytics}
									onChange={(e) =>
										setSelections((s) => ({ ...s, analytics: e.target.checked }))
									}
									className="h-3.5 w-3.5 rounded accent-primary"
								/>
								<span className="font-medium">Analytics</span>
								<span className="text-xs text-muted-foreground">
									— Helps understand visitor behaviour
								</span>
							</label>
						)}

						{enabled.marketing && (
							<label className="flex items-center gap-2 text-sm">
								<input
									type="checkbox"
									checked={selections.marketing}
									onChange={(e) =>
										setSelections((s) => ({ ...s, marketing: e.target.checked }))
									}
									className="h-3.5 w-3.5 rounded accent-primary"
								/>
								<span className="font-medium">Marketing</span>
								<span className="text-xs text-muted-foreground">
									— Personalized content and recommendations
								</span>
							</label>
						)}

						{enabled.functional && (
							<label className="flex items-center gap-2 text-sm">
								<input
									type="checkbox"
									checked={selections.functional}
									onChange={(e) =>
										setSelections((s) => ({
											...s,
											functional: e.target.checked,
										}))
									}
									className="h-3.5 w-3.5 rounded accent-primary"
								/>
								<span className="font-medium">Functional</span>
								<span className="text-xs text-muted-foreground">
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
						className="rounded-lg border px-3 py-2 text-sm font-medium transition-colors hover:bg-muted"
					>
						{showPreferences ? "Hide Preferences" : "Manage Preferences"}
					</button>
					{showPreferences && (
						<button
							type="button"
							onClick={acceptSelected}
							className="rounded-lg border border-primary/30 bg-primary/10 px-3 py-2 text-sm font-medium text-primary transition-colors hover:bg-primary/20"
						>
							Accept Selected
						</button>
					)}
					<button
						type="button"
						onClick={essentialOnly}
						className="rounded-lg border px-3 py-2 text-sm font-medium transition-colors hover:bg-muted"
					>
						Essential Only
					</button>
					<button
						type="button"
						onClick={acceptAll}
						className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:brightness-110"
					>
						Accept All
					</button>
				</div>
			</div>
		</div>
	);
}

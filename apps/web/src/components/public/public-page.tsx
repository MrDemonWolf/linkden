"use client";

import { getContrastRatio, getReadableTextColor } from "@linkden/ui/color-contrast";
import { themePresets } from "@linkden/ui/themes";
import { useMutation } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { trpc } from "@/utils/trpc";
import { AdminBadge } from "./admin-badge";
import { COLOR_MODE_COOKIE } from "./color-mode-script";
import { ConsentBanner, hasAnalyticsConsent } from "./consent-banner";
import { PreviewProvider } from "./preview-context";
import { PageContent } from "./public-page-content";
import { ShareButton } from "./share-button";
import { ThemeToggle } from "./theme-toggle";

interface PageData {
	profile: {
		name: string;
		email?: string;
		image: string | null;
		bio: string | null;
		isVerified: boolean;
	};
	blocks: Array<{
		id: string;
		type: string;
		title: string | null;
		url: string | null;
		icon: string | null;
		embedType: string | null;
		embedUrl: string | null;
		socialIcons: string | null;
		config: string | null;
		position: number;
	}>;
	socialNetworks?: Array<{
		slug: string;
		name: string;
		url: string;
		hex: string;
		svgPath: string;
	}>;
	theme?: {
		preset?: string;
		customColors?: Record<string, string>;
	} | null;
	settings: {
		seoTitle: string | null;
		seoDescription: string | null;
		seoOgImage: string | null;
		brandingEnabled: boolean;
		brandingText: string;
		defaultColorMode: string;
		walletPassEnabled: boolean;
		vcardEnabled: boolean;
		contactFormEnabled: boolean;
		captchaProvider: string;
		captchaSiteKey: string | null;
		bannerPreset: string | null;
		bannerEnabled: boolean;
		bannerMode?: "preset" | "custom";
		bannerCustomUrl?: string | null;
		themePreset: string;
		customPrimary: string | null;
		customSecondary: string | null;
		customAccent: string | null;
		customBackground: string | null;
		customCss: string | null;
		brandingPpUrl?: string | null;
		socialIconShape: "circle" | "rounded-square" | null;
		consentBannerEnabled?: boolean;
		consentBannerText?: string | null;
		consentPrivacyUrl?: string | null;
		consentCategories?: string | null;
	};
}

export type ColorMode = "light" | "dark";

interface PublicPageProps {
	data: PageData;
	/** Resolved on the server from the `linkden-color-mode` cookie (else the admin default). */
	initialColorMode?: ColorMode;
	/**
	 * Admin previewer: color mode follows this prop, floating controls and the
	 * consent banner are hidden, nothing is tracked, and the wrapper fills its
	 * frame (`min-h-full`) instead of the viewport.
	 */
	previewMode?: ColorMode;
}

export interface ThemeColors {
	primary: string;
	secondary: string;
	accent: string;
	bg: string;
	fg: string;
	card: string;
	cardFg: string;
	border: string;
	muted: string;
	mutedFg: string;
}

export function getThemeColors(
	themePresetName: string,
	colorMode: "light" | "dark",
	customColors?: {
		primary?: string | null;
		secondary?: string | null;
		accent?: string | null;
		background?: string | null;
	},
): ThemeColors {
	const theme = themePresets.find((t) => t.name === themePresetName) ?? themePresets[0];
	const vars = theme.cssVars[colorMode];
	const colors: ThemeColors = {
		primary: vars["--ld-primary"],
		secondary: vars["--ld-secondary"],
		accent: vars["--ld-accent"],
		bg: vars["--ld-background"],
		fg: vars["--ld-foreground"],
		card: vars["--ld-card"],
		cardFg: vars["--ld-card-foreground"],
		border: vars["--ld-border"],
		muted: vars["--ld-muted"],
		mutedFg: vars["--ld-muted-foreground"],
	};
	// Custom overrides apply in both color modes
	if (customColors) {
		if (customColors.primary) colors.primary = customColors.primary;
		if (customColors.secondary) colors.secondary = customColors.secondary;
		if (customColors.accent) colors.accent = customColors.accent;
		if (customColors.background) {
			colors.bg = customColors.background;
			// A custom background can leave the preset's foreground unreadable
			// (e.g. a light custom bg paired with dark-mode's near-white fg) —
			// re-derive fg only when the pairing actually fails AA.
			if (getContrastRatio(colors.fg, colors.bg) < 4.5) {
				colors.fg = getReadableTextColor(colors.bg);
			}
		}
	}
	return colors;
}

export function PublicPage({ data, initialColorMode, previewMode }: PublicPageProps) {
	const [storedMode, setStoredMode] = useState<ColorMode>(
		initialColorMode ?? (data.settings.defaultColorMode === "dark" ? "dark" : "light"),
	);
	const colorMode = previewMode ?? storedMode;

	// ColorModeScript stamps the pre-paint resolution (cookie, else system
	// preference) on <html>; adopt it once so a `system` default lands right.
	useEffect(() => {
		if (previewMode) return;
		const stamped = document.documentElement.dataset.ldMode;
		if (stamped === "light" || stamped === "dark") setStoredMode(stamped);
	}, [previewMode]);

	const toggleColorMode = () => {
		const next: ColorMode = colorMode === "light" ? "dark" : "light";
		setStoredMode(next);
		document.documentElement.dataset.ldMode = next;
		// biome-ignore lint/suspicious/noDocumentCookie: Cookie Store API is Chromium-only
		document.cookie = `${COLOR_MODE_COOKIE}=${next}; path=/; max-age=31536000; SameSite=Lax`;
	};

	const { mutate: trackView } = useMutation(trpc.public.trackView.mutationOptions());
	useEffect(() => {
		// Referrer / UA / country are derived server-side from request headers.
		if (!previewMode && hasAnalyticsConsent(data.settings.consentBannerEnabled)) trackView();
	}, [previewMode, data.settings.consentBannerEnabled, trackView]);

	const themeColors = getThemeColors(data.settings.themePreset, colorMode, {
		primary: data.settings.customPrimary,
		secondary: data.settings.customSecondary,
		accent: data.settings.customAccent,
		background: data.settings.customBackground,
	});

	const content = (
		<PageContent
			profile={data.profile}
			blocks={data.blocks}
			socialNetworks={data.socialNetworks}
			settings={{
				brandingEnabled: data.settings.brandingEnabled,
				brandingText: data.settings.brandingText,
				walletPassEnabled: data.settings.walletPassEnabled,
				vcardEnabled: data.settings.vcardEnabled,
				contactFormEnabled: data.settings.contactFormEnabled,
				captchaProvider: data.settings.captchaProvider,
				captchaSiteKey: data.settings.captchaSiteKey,
				bannerPreset: data.settings.bannerPreset,
				bannerEnabled: data.settings.bannerEnabled,
				bannerMode: data.settings.bannerMode,
				bannerCustomUrl: data.settings.bannerCustomUrl,
				customCss: data.settings.customCss,
				brandingPpUrl: data.settings.brandingPpUrl,
				socialIconShape: data.settings.socialIconShape,
			}}
			themeColors={themeColors}
			colorMode={colorMode}
		/>
	);

	// Floating controls stay outside `.ld-page`: it is a size container, and a
	// container's layout containment would turn it into the containing block
	// for `position: fixed` descendants (they'd scroll with the page).
	return (
		<div
			className={previewMode ? "min-h-full" : "min-h-dvh"}
			style={{
				backgroundColor: themeColors.bg,
				color: themeColors.fg,
				transition: "background-color 0.5s ease, color 0.5s ease",
			}}
		>
			{previewMode ? (
				<PreviewProvider>{content}</PreviewProvider>
			) : (
				<>
					{/* Fixed navy/white pair (not admin tokens): AA-safe over any public theme.
					    ponytail: sits above the admin pill (z-60 vs z-50) instead of dodging it. */}
					<a
						href="#main-content"
						className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:rounded-md focus:bg-[#091533] focus:px-4 focus:py-2 focus:text-white"
					>
						Skip to content
					</a>
					<AdminBadge themeColors={themeColors} />
					<div className="fixed right-4 top-4 z-50 flex items-center gap-2">
						<ShareButton title={data.profile.name} themeColors={themeColors} />
						<ThemeToggle
							colorMode={colorMode}
							onToggle={toggleColorMode}
							themeColors={themeColors}
						/>
					</div>
					{content}
					<ConsentBanner
						settings={{
							consentBannerEnabled: data.settings.consentBannerEnabled !== false,
							consentBannerText: data.settings.consentBannerText ?? null,
							consentPrivacyUrl: data.settings.consentPrivacyUrl ?? null,
							consentCategories: data.settings.consentCategories ?? null,
						}}
						themeColors={themeColors}
						colorMode={colorMode}
					/>
				</>
			)}
		</div>
	);
}

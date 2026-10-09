"use client";

import { useMutation } from "@tanstack/react-query";
import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import { getThemeColors } from "@/lib/theme-colors";
import { trpc } from "@/utils/trpc";
import type { ResolvedBlockIcon } from "./block-icon";
import { COLOR_MODE_COOKIE } from "./color-mode-script";
import { ConsentBanner, hasAnalyticsConsent, onConsentChange } from "./consent-banner";
import { PreviewProvider } from "./preview-context";
import { PageContent } from "./public-page-content";
import { ShareButton } from "./share-button";
import { ThemeToggle } from "./theme-toggle";

// Re-exported so the block components keep importing the palette type from here.
export { getThemeColors, type ThemeColors } from "@/lib/theme-colors";

// Only a signed-in admin ever sees the pill, so its better-auth client and the
// get-session request stay out of every anonymous visit: the server passes
// `maybeAdmin` (session cookie present) and the badge loads on demand.
const AdminBadge = dynamic(() => import("./admin-badge").then((m) => m.AdminBadge), {
	ssr: false,
});

/** A BCP-47-shaped tag (e.g. "en", "de", "pt-BR"); anything else is ignored. */
const LANG_TAG = /^[A-Za-z]{2,3}(?:-[A-Za-z0-9]{2,8}){0,3}$/;

interface PageData {
	profile: {
		name: string;
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
		/** Server-resolved block icon (app/page.tsx); absent in the admin preview. */
		iconSvg?: ResolvedBlockIcon | null;
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
		vcardEnabled: boolean;
		/**
		 * The footer "Save vCard" download has something to serve (vCard on, no
		 * vCard block, global vCard data saved). Optional until public.getPage
		 * reports it; absent → the old vcardEnabled-and-no-block rule.
		 */
		vcardDownloadAvailable?: boolean;
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
		/** Privacy policy text (text mode only; the URL is then null). */
		brandingPpText?: string | null;
		/** Footer branding link (http/https). */
		brandingLink?: string | null;
		socialIconShape: "circle" | "rounded-square" | null;
		consentBannerEnabled?: boolean;
		consentBannerText?: string | null;
		consentPrivacyUrl?: string | null;
		consentCategories?: string | null;
		/** Page language (BCP-47) for `lang`; English when unset. */
		siteLanguage?: string | null;
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
	/**
	 * A Better Auth session cookie came with the request (app/page.tsx). Only
	 * gates loading the Admin pill — the badge still verifies the session.
	 */
	maybeAdmin?: boolean;
}

export function PublicPage({ data, initialColorMode, previewMode, maybeAdmin }: PublicPageProps) {
	const [storedMode, setStoredMode] = useState<ColorMode>(
		initialColorMode ?? (data.settings.defaultColorMode === "dark" ? "dark" : "light"),
	);
	const colorMode = previewMode ?? storedMode;

	// ColorModeScript stamps the pre-paint resolution (cookie, else system
	// preference) on <html>; adopt it once so a `system` default lands right.
	// The server usually renders the right mode already (cookie, or Chromium's
	// color-scheme client hint); when it couldn't (Safari/Firefox first visit),
	// the correction is applied instantly rather than as a 0.5s colour fade.
	const mountMode = useRef(storedMode);
	const transitionGuard = useRef<HTMLStyleElement | null>(null);
	useEffect(() => {
		if (previewMode) return;
		const stamped = document.documentElement.dataset.ldMode;
		if (stamped !== "light" && stamped !== "dark") return;
		if (stamped !== mountMode.current && !transitionGuard.current) {
			const guard = document.createElement("style");
			guard.textContent = "*,*::before,*::after{transition:none!important}";
			document.head.appendChild(guard);
			transitionGuard.current = guard;
		}
		setStoredMode(stamped);
	}, [previewMode]);
	useEffect(() => {
		const guard = transitionGuard.current;
		if (!guard || storedMode === mountMode.current) return;
		transitionGuard.current = null;
		// The corrected palette is committed: flush styles with transitions off,
		// then restore them for the visitor's own toggles.
		window.getComputedStyle(document.body).getPropertyValue("color");
		const id = window.setTimeout(() => guard.remove(), 50);
		return () => {
			window.clearTimeout(id);
			guard.remove();
		};
	}, [storedMode]);

	const toggleColorMode = () => {
		const next: ColorMode = colorMode === "light" ? "dark" : "light";
		setStoredMode(next);
		document.documentElement.dataset.ldMode = next;
		// biome-ignore lint/suspicious/noDocumentCookie: Cookie Store API is Chromium-only
		document.cookie = `${COLOR_MODE_COOKIE}=${next}; path=/; max-age=31536000; SameSite=Lax`;
	};

	const { mutate: trackView } = useMutation(trpc.public.trackView.mutationOptions());
	// At most one view per page load: on mount when consent is already stored,
	// otherwise the moment the visitor grants analytics in the banner (a
	// first visit has no stored consent yet, and its clicks are counted after
	// accepting — the view must be too, or CTR runs past 100%).
	const viewTracked = useRef(false);
	useEffect(() => {
		if (previewMode) return;
		const track = () => {
			if (viewTracked.current) return;
			viewTracked.current = true;
			// Country is derived server-side; the referrer is the page's own
			// document.referrer (the request's Referer would be this page).
			trackView({ referrer: document.referrer || undefined });
		};
		if (hasAnalyticsConsent(data.settings.consentBannerEnabled)) track();
		return onConsentChange((consent) => {
			if (consent.analytics) track();
		});
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
				vcardEnabled: data.settings.vcardEnabled,
				contactFormEnabled: data.settings.contactFormEnabled,
				vcardDownloadAvailable: data.settings.vcardDownloadAvailable,
				captchaProvider: data.settings.captchaProvider,
				captchaSiteKey: data.settings.captchaSiteKey,
				bannerPreset: data.settings.bannerPreset,
				bannerEnabled: data.settings.bannerEnabled,
				bannerMode: data.settings.bannerMode,
				bannerCustomUrl: data.settings.bannerCustomUrl,
				customCss: data.settings.customCss,
				brandingPpUrl: data.settings.brandingPpUrl,
				brandingPpText: data.settings.brandingPpText,
				brandingLink: data.settings.brandingLink,
				socialIconShape: data.settings.socialIconShape,
				consentBannerEnabled: data.settings.consentBannerEnabled !== false,
			}}
			themeColors={themeColors}
			colorMode={colorMode}
		/>
	);

	const pageLang =
		data.settings.siteLanguage && LANG_TAG.test(data.settings.siteLanguage)
			? data.settings.siteLanguage
			: undefined;
	// The root layout is static (`lang="en"` for admin routes too), so the live
	// page also sets the document language itself (WCAG 3.1.1); the wrapper's
	// `lang` below covers the server HTML before hydration.
	useEffect(() => {
		if (previewMode || !pageLang) return;
		const root = document.documentElement;
		const previous = root.lang;
		root.lang = pageLang;
		return () => {
			root.lang = previous;
		};
	}, [previewMode, pageLang]);

	// Floating controls stay outside `.ld-page`: it is a size container, and a
	// container's layout containment would turn it into the containing block
	// for `position: fixed` descendants (they'd scroll with the page).
	return (
		<div
			className={previewMode ? "min-h-full" : "min-h-dvh"}
			lang={pageLang}
			style={{
				backgroundColor: themeColors.bg,
				color: themeColors.fg,
				transition: "background-color 0.5s ease, color 0.5s ease",
				// Room for the fixed consent banner (its measured height, set by
				// ConsentBanner while it shows) so the last links can scroll clear.
				paddingBottom: previewMode ? undefined : "var(--ld-consent-h, 0px)",
			}}
		>
			{previewMode ? (
				<PreviewProvider>{content}</PreviewProvider>
			) : (
				<>
					{/* Fixed navy/white pair (not admin tokens): AA-safe over any public theme.
					    It sits above the admin pill (z-60 vs z-50) instead of dodging it. */}
					<a
						href="#main-content"
						className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:rounded-md focus:bg-[#091533] focus:px-4 focus:py-2 focus:text-white"
					>
						Skip to content
					</a>
					{maybeAdmin && <AdminBadge themeColors={themeColors} />}
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
							consentPrivacyText: data.settings.brandingPpText ?? null,
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

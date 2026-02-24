"use client";

import { useState } from "react";
import { themePresets } from "@linkden/ui/themes";
import { ThemeToggle } from "./theme-toggle";
import { PublicPageContent } from "./public-page-content";

interface SocialNetwork {
	slug: string;
	name: string;
	url: string;
	hex: string;
	svgPath: string;
}

interface PageData {
	profile: {
		name: string;
		email: string;
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
	socialNetworks?: SocialNetwork[];
	theme: {
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
		themePreset: string;
		customPrimary: string | null;
		customSecondary: string | null;
		customAccent: string | null;
		customBackground: string | null;
		customCss: string | null;
	};
}

export interface ThemeColors {
	primary: string;
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
	customColors?: { primary?: string | null; secondary?: string | null; accent?: string | null; background?: string | null },
): ThemeColors {
	const theme = themePresets.find((t) => t.name === themePresetName) ?? themePresets[0];
	const vars = theme.cssVars[colorMode];
	const colors: ThemeColors = {
		primary: vars["--ld-primary"],
		accent: vars["--ld-accent"],
		bg: vars["--ld-background"],
		fg: vars["--ld-foreground"],
		card: vars["--ld-card"],
		cardFg: vars["--ld-card-foreground"],
		border: vars["--ld-border"],
		muted: vars["--ld-muted"],
		mutedFg: vars["--ld-muted-foreground"],
	};
	// Custom overrides apply in light mode only (stored as light-mode values)
	if (colorMode === "light" && customColors) {
		if (customColors.primary) colors.primary = customColors.primary;
		if (customColors.accent) colors.accent = customColors.accent;
		if (customColors.background) colors.bg = customColors.background;
	}
	return colors;
}

export function PublicPage({ data, isAdmin }: { data: PageData; isAdmin?: boolean }) {
	const getInitialColorMode = (): "light" | "dark" => {
		if (typeof window === "undefined") {
			return data.settings.defaultColorMode === "dark" ? "dark" : "light";
		}
		const saved = localStorage.getItem("linkden-color-mode");
		if (saved === "light" || saved === "dark") return saved;
		if (data.settings.defaultColorMode === "dark") return "dark";
		if (data.settings.defaultColorMode === "system") {
			return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
		}
		return "light";
	};

	const [colorMode, setColorMode] = useState<"light" | "dark">(getInitialColorMode);

	const toggleColorMode = () => {
		const next = colorMode === "light" ? "dark" : "light";
		setColorMode(next);
		localStorage.setItem("linkden-color-mode", next);
	};

	const themeColors = getThemeColors(data.settings.themePreset, colorMode, {
		primary: data.settings.customPrimary,
		accent: data.settings.customAccent,
		background: data.settings.customBackground,
	});

	return (
		<div
			className="min-h-dvh"
			style={{
				backgroundColor: themeColors.bg,
				color: themeColors.fg,
				transition: "background-color 0.5s ease, color 0.5s ease",
			}}
		>
			<a
				href="#main-content"
				className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground"
			>
				Skip to content
			</a>

			{isAdmin && (
				<a
					href="/admin"
					className="fixed left-4 top-4 z-50 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium backdrop-blur-xl transition-colors"
					style={{
						backgroundColor: `${themeColors.card}cc`,
						color: themeColors.cardFg,
						border: `1px solid ${themeColors.border}`,
						transition: "background-color 0.5s ease, color 0.5s ease, border-color 0.5s ease",
					}}
				>
					<svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
						<path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
						<path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
					</svg>
					Admin
				</a>
			)}

			<ThemeToggle colorMode={colorMode} onToggle={toggleColorMode} themeColors={themeColors} />

			<PublicPageContent
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
					customCss: data.settings.customCss,
				}}
				themeColors={themeColors}
				colorMode={colorMode}
			/>
		</div>
	);
}

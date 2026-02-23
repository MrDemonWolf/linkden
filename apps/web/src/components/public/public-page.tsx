"use client";

import { useState } from "react";
import { themePresets } from "@linkden/ui/themes";
import { Avatar } from "./avatar";
import { BannerSection } from "./banner-section";
import { LinkBlock } from "./link-block";
import { HeaderBlock } from "./header-block";
import { SocialIconsBlock } from "./social-icons-block";
import { EmbedBlock } from "./embed-block";
import { ContactFormBlock } from "./contact-form-block";
import { WhitelabelFooter } from "./whitelabel-footer";
import { ThemeToggle } from "./theme-toggle";

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

function parseConfig(config: string | null): Record<string, unknown> {
	if (!config) return {};
	try {
		return JSON.parse(config);
	} catch {
		return {};
	}
}

function getThemeColors(themePresetName: string, colorMode: "light" | "dark"): ThemeColors {
	const theme = themePresets.find((t) => t.name === themePresetName) ?? themePresets[0];
	const vars = theme.cssVars[colorMode];
	return {
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

	const hasBanner = data.settings.bannerEnabled && data.settings.bannerPreset;
	const themeColors = getThemeColors(data.settings.themePreset, colorMode);

	return (
		<div
			className="ld-page min-h-dvh"
			style={{
				backgroundColor: themeColors.bg,
				color: themeColors.fg,
				transition: "background-color 0.5s ease, color 0.5s ease",
			}}
		>
			{data.settings.customCss && <style>{data.settings.customCss}</style>}

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

			{hasBanner && (
				<BannerSection
					bannerPreset={data.settings.bannerPreset!}
					colorMode={colorMode}
					bgColor={themeColors.bg}
					themeColors={themeColors}
				/>
			)}

			<main
				id="main-content"
				className={`mx-auto max-w-lg px-4 ${hasBanner ? "py-0" : "py-8 md:py-12"}`}
				role="main"
			>
				{/* Profile Section */}
				<header className={`ld-profile relative z-10 mb-8 text-center ${hasBanner ? "-mt-20" : ""}`}>
					<Avatar
						src={data.profile.image}
						name={data.profile.name}
						size="lg"
						hasBanner={!!hasBanner}
						ringColor={hasBanner ? themeColors.bg : undefined}
						themeColors={{ primary: themeColors.primary, accent: themeColors.accent }}
					/>
					<h1 className="mt-4 inline-flex items-center justify-center gap-1.5 text-2xl font-bold">
						{data.profile.name}
						{data.profile.isVerified && (
							<svg
								className="h-6 w-6 text-blue-500 shrink-0"
								viewBox="0 0 24 24"
								fill="currentColor"
								aria-hidden="true"
								role="img"
								aria-label="Verified account"
							>
								<path fillRule="evenodd" d="M8.603 3.799A4.49 4.49 0 0112 2.25c1.357 0 2.573.6 3.397 1.549a4.49 4.49 0 013.498 1.307 4.491 4.491 0 011.307 3.497A4.49 4.49 0 0121.75 12a4.49 4.49 0 01-1.549 3.397 4.491 4.491 0 01-1.307 3.497 4.491 4.491 0 01-3.497 1.307A4.49 4.49 0 0112 21.75a4.49 4.49 0 01-3.397-1.549 4.49 4.49 0 01-3.498-1.306 4.491 4.491 0 01-1.307-3.498A4.49 4.49 0 012.25 12c0-1.357.6-2.573 1.549-3.397a4.49 4.49 0 011.307-3.497 4.49 4.49 0 013.497-1.307zm7.007 6.387a.75.75 0 10-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.14-.094l3.75-5.25z" clipRule="evenodd" />
							</svg>
						)}
					</h1>
					{data.profile.bio && (
						<p
							className="ld-bio mt-2 text-sm"
							style={{
								color: themeColors.mutedFg,
								transition: "color 0.5s ease",
							}}
						>
							{data.profile.bio}
						</p>
					)}
				</header>

				{/* Blocks */}
				<div className="ld-blocks space-y-3" role="list" aria-label="Links and content">
					{data.blocks.map((blockData) => {
						const config = parseConfig(blockData.config);

						switch (blockData.type) {
							case "link":
								return (
									<LinkBlock
										key={blockData.id}
										block={blockData}
										config={config}
										colorMode={colorMode}
										themeColors={themeColors}
									/>
								);
							case "header":
								return (
									<HeaderBlock
										key={blockData.id}
										block={blockData}
										config={config}
										colorMode={colorMode}
									/>
								);
							case "social_icons":
								return (
									<SocialIconsBlock
										key={blockData.id}
										block={blockData}
										config={config}
										colorMode={colorMode}
										networks={data.socialNetworks}
									/>
								);
							case "embed":
								return (
									<EmbedBlock
										key={blockData.id}
										block={blockData}
										config={config}
										colorMode={colorMode}
									/>
								);
							case "contact_form":
								return (
									<ContactFormBlock
										key={blockData.id}
										block={blockData}
										config={config}
										colorMode={colorMode}
										captchaProvider={
											data.settings.captchaProvider
										}
										captchaSiteKey={
											data.settings.captchaSiteKey
										}
									/>
								);
							default:
								return null;
						}
					})}
				</div>

				{/* VCard / Wallet Buttons */}
				<div className="mt-8 flex justify-center gap-3">
					{data.settings.vcardEnabled && (
						<a
							href="/api/vcard"
							className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all duration-300"
							style={{
								backgroundColor: themeColors.card,
								color: themeColors.cardFg,
								border: `1px solid ${themeColors.border}`,
								transition: "background-color 0.5s ease, color 0.5s ease, border-color 0.5s ease",
							}}
							download="contact.vcf"
						>
							<svg
								className="h-4 w-4"
								fill="none"
								viewBox="0 0 24 24"
								stroke="currentColor"
								strokeWidth={2}
								aria-hidden="true"
							>
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
								/>
							</svg>
							Download Contact
						</a>
					)}
					{data.settings.walletPassEnabled && (
						<a
							href="/api/wallet-pass"
							className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all duration-300"
							style={{
								backgroundColor: themeColors.card,
								color: themeColors.cardFg,
								border: `1px solid ${themeColors.border}`,
								transition: "background-color 0.5s ease, color 0.5s ease, border-color 0.5s ease",
							}}
						>
							<svg
								className="h-4 w-4"
								fill="none"
								viewBox="0 0 24 24"
								stroke="currentColor"
								strokeWidth={2}
								aria-hidden="true"
							>
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
								/>
							</svg>
							Add to Wallet
						</a>
					)}
				</div>
			</main>

			{data.settings.brandingEnabled && (
				<WhitelabelFooter
					text={data.settings.brandingText}
					mutedFg={themeColors.mutedFg}
				/>
			)}
		</div>
	);
}

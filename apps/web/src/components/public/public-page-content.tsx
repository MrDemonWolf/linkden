"use client";

import { Avatar } from "./avatar";
import { LinkBlock } from "./link-block";
import { HeaderBlock } from "./header-block";
import { EmbedBlock } from "./embed-block";
import { ConnectBlock } from "./connect-block";
import { VCardBlock } from "./vcard-block";
import { LocationBlock } from "./location-block";
import { WhitelabelFooter } from "./whitelabel-footer";
import { FooterActions } from "./footer-actions";
import { ShaderBanner } from "./shader-banner";
import { usePreview } from "./preview-context";
import { ProfileSocialIcons } from "./profile-social-icons";
import type { ThemeColors } from "./public-page";
import { getPresetById } from "@linkden/ui/banner-presets";
import { useEntranceAnimation } from "@/hooks/use-entrance-animation";

interface SocialNetwork {
	slug: string;
	name: string;
	url: string;
	hex: string;
	svgPath: string;
}

export interface PageContentProps {
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
	socialNetworks?: SocialNetwork[];
	settings: {
		brandingEnabled: boolean;
		brandingText: string;
		walletPassEnabled?: boolean;
		vcardEnabled?: boolean;
		contactFormEnabled?: boolean;
		captchaProvider?: string;
		captchaSiteKey?: string | null;
		bannerPreset: string | null;
		bannerEnabled: boolean;
		bannerMode?: "preset" | "custom";
		bannerCustomUrl?: string | null;
		customCss?: string | null;
		brandingPpUrl?: string | null;
		socialIconShape?: "circle" | "rounded-square" | null;
	};
	themeColors: ThemeColors;
	colorMode: "light" | "dark";
}

function parseConfig(config: string | null): Record<string, unknown> {
	if (!config) return {};
	try {
		return JSON.parse(config);
	} catch {
		return {};
	}
}

export function PageSkeleton() {
	return (
		<div className="flex flex-col items-center gap-4 animate-pulse px-4 py-8">
			<div className="h-20 w-20 rounded-full bg-muted" />
			<div className="h-5 w-36 rounded-full bg-muted" />
			<div className="space-y-1.5 w-full max-w-xs">
				<div className="h-4 w-48 rounded-full bg-muted mx-auto" />
				<div className="h-4 w-32 rounded-full bg-muted mx-auto" />
			</div>
			{[0, 1, 2].map((i) => (
				<div key={i} className="h-12 w-full max-w-sm rounded-xl bg-muted" />
			))}
		</div>
	);
}

function renderBlock(
	blockData: PageContentProps["blocks"][number],
	{
		colorMode,
		themeColors,
		settings,
	}: {
		colorMode: "light" | "dark";
		themeColors: ThemeColors;
		settings: PageContentProps["settings"];
	},
) {
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
					themeColors={themeColors}
				/>
			);
		case "embed":
			return (
				<EmbedBlock
					key={blockData.id}
					block={blockData}
					config={config}
					colorMode={colorMode}
					themeColors={themeColors}
				/>
			);

		case "connect":
			return (
				<ConnectBlock
					key={blockData.id}
					block={blockData}
					config={config}
					colorMode={colorMode}
					themeColors={themeColors}
					ppUrl={settings.brandingPpUrl ?? undefined}
				/>
			);
		case "vcard":
			return (
				<VCardBlock
					key={blockData.id}
					block={blockData}
					config={config}
					colorMode={colorMode}
					themeColors={themeColors}
				/>
			);
		case "location":
			return (
				<LocationBlock
					key={blockData.id}
					block={blockData}
					config={config}
					colorMode={colorMode}
					themeColors={themeColors}
				/>
			);
		default:
			return null;
	}
}

export function PageContent({
	profile,
	blocks,
	socialNetworks,
	settings,
	themeColors,
	colorMode,
}: PageContentProps) {
	const { isPreview } = usePreview();

	const showCover = !!(
		settings.bannerEnabled &&
		(settings.bannerPreset || (settings.bannerMode === "custom" && settings.bannerCustomUrl))
	);

	const Wrapper = isPreview ? "div" : "main";
	const ProfileWrapper = isPreview ? "div" : "header";

	// Filter out social_icons blocks — social icons now render in the hero card
	const contentBlocks = blocks.filter((b) => b.type !== "social_icons");
	const hasVcardBlock = contentBlocks.some((b) => b.type === "vcard");

	// Stagger entrance animation on block stream — 50ms cascade
	const { getAnimationProps } = useEntranceAnimation({ baseDelay: 0, stagger: 50 });

	// Project resolved theme into CSS variables so shared @linkden/ui components
	// (which read var(--ld-*)) inherit the live theme without prop threading.
	const cssVarStyle = {
		"--ld-primary": themeColors.primary,
		"--ld-secondary": themeColors.secondary,
		"--ld-accent": themeColors.accent,
		"--ld-background": themeColors.bg,
		"--ld-foreground": themeColors.fg,
		"--ld-card": themeColors.card,
		"--ld-card-foreground": themeColors.cardFg,
		"--ld-border": themeColors.border,
		"--ld-muted": themeColors.muted,
		"--ld-muted-foreground": themeColors.mutedFg,
		backgroundColor: themeColors.bg,
		color: themeColors.fg,
		transition: "background-color 0.5s ease, color 0.5s ease",
	} as React.CSSProperties;

	// Derive the hero surface from resolved theme values so the card reads as a
	// solid, tappable panel over a flat background (no blur backdrop to rely on).
	const heroCardStyle: React.CSSProperties = {
		backgroundColor: themeColors.card,
		borderColor: themeColors.border,
		boxShadow: `0 12px 32px -16px ${themeColors.primary}33`,
		transition: "background-color 0.5s ease, border-color 0.5s ease",
	};

	const coverPreset =
		showCover && settings.bannerMode !== "custom"
			? getPresetById(settings.bannerPreset || "", themeColors)
			: null;

	return (
		<div className="ld-page flex min-h-dvh flex-col" style={cssVarStyle}>
			{settings.customCss && (
				<style>{settings.customCss.slice(0, 20000).replace(/<\/style/gi, "<\\/style")}</style>
			)}

			<Wrapper
				{...(!isPreview ? { id: "main-content", role: "main" } : {})}
				className="mx-auto w-full max-w-lg px-4 py-10 md:py-14"
			>
				{/* Hero card: cover + avatar + name + bio + socials */}
				<ProfileWrapper
					className="ld-hero relative mb-6 overflow-hidden rounded-3xl border shadow-lg shadow-black/5 backdrop-blur-2xl"
					style={heroCardStyle}
				>
					{showCover && (
						<div className="ld-hero-cover relative h-28 w-full overflow-hidden sm:h-36">
							{settings.bannerMode === "custom" && settings.bannerCustomUrl ? (
								<img src={settings.bannerCustomUrl} alt="" className="h-full w-full object-cover" />
							) : coverPreset ? (
								<div
									className={`absolute inset-0 ${coverPreset.type === "css" ? (coverPreset.className ?? "") : ""}`}
									style={coverPreset.type === "css" ? coverPreset.style : undefined}
								>
									{coverPreset.type === "shader" && <ShaderBanner preset={coverPreset} />}
								</div>
							) : null}
						</div>
					)}

					<div className={`ld-hero-body px-6 pb-7 text-center ${showCover ? "-mt-12" : "pt-8"}`}>
						<Avatar
							src={profile.image}
							name={profile.name}
							email={profile.email}
							size="lg"
							hasBanner={showCover}
							colorMode={colorMode}
							ringColor={
								showCover
									? colorMode === "dark"
										? "rgba(20,20,22,1)"
										: "rgba(255,255,255,1)"
									: undefined
							}
							themeColors={{
								primary: themeColors.primary,
								accent: themeColors.accent,
								bg: themeColors.bg,
							}}
						/>

						<h1 className="mt-4 inline-flex items-center justify-center gap-1.5 text-2xl font-bold tracking-tight">
							{profile.name}
							{profile.isVerified && (
								<svg
									className="h-6 w-6 shrink-0"
									style={{
										color: themeColors.primary,
										filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.15))",
									}}
									viewBox="0 0 24 24"
									fill="currentColor"
									role="img"
									aria-label="Verified account"
								>
									<title>Verified</title>
									<path
										fillRule="evenodd"
										d="M8.603 3.799A4.49 4.49 0 0112 2.25c1.357 0 2.573.6 3.397 1.549a4.49 4.49 0 013.498 1.307 4.491 4.491 0 011.307 3.497A4.49 4.49 0 0121.75 12a4.49 4.49 0 01-1.549 3.397 4.491 4.491 0 01-1.307 3.497 4.491 4.491 0 01-3.497 1.307A4.49 4.49 0 0112 21.75a4.49 4.49 0 01-3.397-1.549 4.49 4.49 0 01-3.498-1.306 4.491 4.491 0 01-1.307-3.498A4.49 4.49 0 012.25 12c0-1.357.6-2.573 1.549-3.397a4.49 4.49 0 011.307-3.497 4.49 4.49 0 013.497-1.307zm7.007 6.387a.75.75 0 10-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.14-.094l3.75-5.25z"
										clipRule="evenodd"
									/>
								</svg>
							)}
						</h1>

						{profile.bio && (
							<p
								className="ld-bio mt-3 text-[15px] leading-relaxed max-w-sm mx-auto"
								style={{ color: themeColors.mutedFg, transition: "color 0.5s ease" }}
							>
								{profile.bio}
							</p>
						)}

						{socialNetworks && socialNetworks.length > 0 && (
							<ProfileSocialIcons
								networks={socialNetworks}
								colorMode={colorMode}
								themeColors={themeColors}
								shape={settings.socialIconShape ?? "circle"}
							/>
						)}
					</div>
				</ProfileWrapper>

				{/* Single-column block stream — 50ms staggered fade-in */}
				<ul className="ld-blocks space-y-3.5 pb-8" aria-label="Links and content">
					{contentBlocks.map((blockData, index) => (
						// The wrapper <li> owns both the list semantics and the per-index
						// stagger delay, so each block renders a plain <a>/<div>. Letting a
						// block emit its own <li> would nest <li> in <li>, and a bare block
						// element as a direct <ul> child is equally invalid HTML.
						<li key={blockData.id} style={getAnimationProps(index).style}>
							{renderBlock(blockData, { colorMode, themeColors, settings })}
						</li>
					))}
				</ul>

				{!isPreview && (
					<FooterActions
						walletEnabled={!!settings.walletPassEnabled}
						vcardEnabled={!!settings.vcardEnabled && !hasVcardBlock}
						themeColors={themeColors}
					/>
				)}
			</Wrapper>

			{settings.brandingEnabled && (
				<WhitelabelFooter
					text={settings.brandingText}
					mutedFg={themeColors.mutedFg}
					profileName={profile.name}
				/>
			)}
		</div>
	);
}

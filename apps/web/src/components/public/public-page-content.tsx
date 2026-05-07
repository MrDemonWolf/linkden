"use client";

import { Avatar } from "./avatar";
import { BannerSection } from "./banner-section";
import { LinkBlock } from "./link-block";
import { HeaderBlock } from "./header-block";
import { EmbedBlock } from "./embed-block";
import { ConnectBlock } from "./connect-block";
import { VCardBlock } from "./vcard-block";
import { LocationBlock } from "./location-block";
import { WhitelabelFooter } from "./whitelabel-footer";
import { FooterActions } from "./footer-actions";
import { usePreview } from "./preview-context";
import { ProfileSocialIcons } from "./profile-social-icons";
import type { ThemeColors } from "./public-page";
import { themePresets } from "@linkden/ui";
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

/** @deprecated Use PageContentProps instead */
export type PublicPageContentProps = PageContentProps;

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

/** Group consecutive blocks with layout:"inline" into 50/50 pairs */
function groupBlocksWithInlineRows(
	blocks: PageContentProps["blocks"],
): Array<{ type: "single"; block: PageContentProps["blocks"][number] } | { type: "inline-row"; blocks: PageContentProps["blocks"] }> {
	const result: Array<{ type: "single"; block: PageContentProps["blocks"][number] } | { type: "inline-row"; blocks: PageContentProps["blocks"] }> = [];
	let inlineBuffer: PageContentProps["blocks"] = [];

	for (const block of blocks) {
		const config = parseConfig(block.config);
		if (config.layout === "inline" && block.type === "link") {
			inlineBuffer.push(block);
			// Flush pairs
			if (inlineBuffer.length === 2) {
				result.push({ type: "inline-row", blocks: [...inlineBuffer] });
				inlineBuffer = [];
			}
		} else {
			// Flush any remaining single inline block
			if (inlineBuffer.length > 0) {
				for (const b of inlineBuffer) {
					result.push({ type: "single", block: b });
				}
				inlineBuffer = [];
			}
			result.push({ type: "single", block });
		}
	}
	// Flush remaining
	for (const b of inlineBuffer) {
		result.push({ type: "single", block: b });
	}

	return result;
}

function renderBlock(
	blockData: PageContentProps["blocks"][number],
	{
		colorMode,
		themeColors,
		socialNetworks,
		settings,
	}: {
		colorMode: "light" | "dark";
		themeColors: ThemeColors;
		socialNetworks?: SocialNetwork[];
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
	const hasBanner = settings.bannerEnabled && (settings.bannerPreset || (settings.bannerMode === "custom" && settings.bannerCustomUrl));

	const Wrapper = isPreview ? "div" : "main";
	const ProfileWrapper = isPreview ? "div" : "header";

	// Filter out social_icons blocks — social icons now render in the profile header
	const contentBlocks = blocks.filter((b) => b.type !== "social_icons");
	const groupedBlocks = groupBlocksWithInlineRows(contentBlocks);
	const hasVcardBlock = contentBlocks.some((b) => b.type === "vcard");

	// Stagger entrance animation on block stream (Variant A: 50ms cascade)
	const { getAnimationProps } = useEntranceAnimation({ baseDelay: 0, stagger: 50 });

	// Project resolved theme into CSS variables so shared @linkden/ui components
	// (which read var(--ld-*)) inherit the live theme without prop threading.
	const cssVarStyle = {
		"--ld-primary": themeColors.primary,
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

	return (
		<div
			className="ld-page min-h-dvh"
			style={cssVarStyle}
		>
			{settings.customCss && <style>{settings.customCss}</style>}

			{hasBanner && (
				<BannerSection
					bannerPreset={settings.bannerPreset || ""}
					colorMode={colorMode}
					bgColor={themeColors.bg}
					themeColors={themeColors}
					bannerMode={settings.bannerMode}
					bannerCustomUrl={settings.bannerCustomUrl || undefined}
				/>
			)}

			<Wrapper
				{...(!isPreview ? { id: "main-content", role: "main" } : {})}
				className={`mx-auto max-w-lg px-4 ${hasBanner ? "py-0" : "py-10 md:py-16"}`}
			>
				{/* Profile Section: Avatar -> Name -> Bio -> Social Icons */}
				<ProfileWrapper className={`ld-profile relative z-10 mb-10 text-center ${hasBanner ? "-mt-20" : ""}`}>
					<Avatar
						src={profile.image}
						name={profile.name}
						email={profile.email}
						size="lg"
						hasBanner={!!hasBanner}
						ringColor={hasBanner ? themeColors.bg : undefined}
						themeColors={{ primary: themeColors.primary, accent: themeColors.accent }}
					/>

					<h1 className="mt-5 inline-flex items-center justify-center gap-1.5 text-2xl font-bold tracking-tight">
						{profile.name}
						{profile.isVerified && (
							<svg
								className="h-6 w-6 shrink-0"
								style={{ color: themeColors.primary, filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.15))" }}
								viewBox="0 0 24 24"
								fill="currentColor"
								aria-hidden="true"
								role="img"
								aria-label="Verified account"
							>
								<title>Verified</title>
								<path fillRule="evenodd" d="M8.603 3.799A4.49 4.49 0 0112 2.25c1.357 0 2.573.6 3.397 1.549a4.49 4.49 0 013.498 1.307 4.491 4.491 0 011.307 3.497A4.49 4.49 0 0121.75 12a4.49 4.49 0 01-1.549 3.397 4.491 4.491 0 01-1.307 3.497 4.491 4.491 0 01-3.497 1.307A4.49 4.49 0 0112 21.75a4.49 4.49 0 01-3.397-1.549 4.49 4.49 0 01-3.498-1.306 4.491 4.491 0 01-1.307-3.498A4.49 4.49 0 012.25 12c0-1.357.6-2.573 1.549-3.397a4.49 4.49 0 011.307-3.497 4.49 4.49 0 013.497-1.307zm7.007 6.387a.75.75 0 10-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.14-.094l3.75-5.25z" clipRule="evenodd" />
							</svg>
						)}
					</h1>

					{profile.bio && (
						<p
							className="ld-bio mt-3 text-[15px] leading-relaxed max-w-sm mx-auto"
							style={{
								color: themeColors.mutedFg,
								transition: "color 0.5s ease",
							}}
						>
							{profile.bio}
						</p>
					)}

					{/* Social Icons — pulled from socialNetwork table, rendered in profile header */}
					{socialNetworks && socialNetworks.length > 0 && (
						<ProfileSocialIcons
							networks={socialNetworks}
							colorMode={colorMode}
							themeColors={themeColors}
							shape={settings.socialIconShape ?? "circle"}
						/>
					)}
				</ProfileWrapper>

				{/* Blocks with inline row support — stagger fade-in (50ms cascade) */}
				<div className="ld-blocks space-y-3.5 pb-8 w-[90%] sm:w-full mx-auto" role="list" aria-label="Links and content">
					{groupedBlocks.map((group, index) => {
						const animProps = getAnimationProps(index);
						if (group.type === "inline-row") {
							const key = group.blocks.map((b) => b.id).join("-");
							return (
								<div
									key={key}
									role="listitem"
									className="ld-inline-row grid grid-cols-2 gap-3"
									style={animProps.style}
								>
									{group.blocks.map((blockData) =>
										renderBlock(blockData, { colorMode, themeColors, socialNetworks, settings }),
									)}
								</div>
							);
						}
						return (
							<div key={group.block.id} style={animProps.style}>
								{renderBlock(group.block, { colorMode, themeColors, socialNetworks, settings })}
							</div>
						);
					})}
				</div>

				{/* Wallet + vCard footer pair — only on public page */}
				{!isPreview && (
					<FooterActions
						walletEnabled={!!settings.walletPassEnabled}
						vcardEnabled={!!settings.vcardEnabled && !hasVcardBlock}
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

/** @deprecated Use PageContent instead */
export const PublicPageContent = PageContent;

"use client";

import { Avatar } from "./avatar";
import { BannerSection } from "./banner-section";
import { LinkBlock } from "./link-block";
import { HeaderBlock } from "./header-block";
import { SocialIconsBlock } from "./social-icons-block";
import { EmbedBlock } from "./embed-block";
import { ContactFormBlock } from "./contact-form-block";
import { VCardBlock } from "./vcard-block";
import { WhitelabelFooter } from "./whitelabel-footer";
import { usePreview } from "./preview-context";
import type { ThemeColors } from "./public-page";

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

	return (
		<div
			className="ld-page min-h-dvh"
			style={{
				backgroundColor: themeColors.bg,
				color: themeColors.fg,
				transition: "background-color 0.5s ease, color 0.5s ease",
			}}
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
				className={`mx-auto max-w-lg px-4 ${hasBanner ? "py-0" : "py-8 md:py-12"}`}
			>
				{/* Profile Section */}
				<ProfileWrapper className={`ld-profile relative z-10 mb-8 text-center ${hasBanner ? "-mt-20" : ""}`}>
					<Avatar
						src={profile.image}
						name={profile.name}
						email={profile.email}
						size="lg"
						hasBanner={!!hasBanner}
						ringColor={hasBanner ? themeColors.bg : undefined}
						themeColors={{ primary: themeColors.primary, accent: themeColors.accent }}
					/>
					<h1 className="mt-4 inline-flex items-center justify-center gap-1.5 text-2xl font-bold">
						{profile.name}
						{profile.isVerified && (
							<svg
								className="h-6 w-6 shrink-0"
								style={{ color: themeColors.primary }}
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
					{profile.bio && (
						<p
							className="ld-bio mt-2 text-sm"
							style={{
								color: themeColors.mutedFg,
								transition: "color 0.5s ease",
							}}
						>
							{profile.bio}
						</p>
					)}
				</ProfileWrapper>

				{/* Blocks */}
				<div className="ld-blocks space-y-3" role="list" aria-label="Links and content">
					{blocks.map((blockData) => {
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
							case "social_icons":
								return (
									<SocialIconsBlock
										key={blockData.id}
										block={blockData}
										config={config}
										colorMode={colorMode}
										networks={socialNetworks}
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
							case "form":
								return (
									<ContactFormBlock
										key={blockData.id}
										block={blockData}
										config={config}
										colorMode={colorMode}
										captchaProvider={settings.captchaProvider ?? "none"}
										captchaSiteKey={settings.captchaSiteKey ?? null}
										themeColors={themeColors}
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
							default:
								return null;
						}
					})}
				</div>

				{/* Wallet Button — only on public page */}
				{!isPreview && settings.walletPassEnabled && (
					<div className="mt-8 flex justify-center gap-3">
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
					</div>
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

"use client";

import { getPresetById } from "@linkden/ui/banner-presets";
import { liveCustomCss, previewCustomCss } from "@/lib/custom-css";
import { Avatar } from "./avatar";
import type { ResolvedBlockIcon } from "./block-icon";
import { Carousel } from "./carousel";
import { ConnectBlock } from "./connect-block";
import { openConsentPreferences } from "./consent-banner";
import { DividerBlock } from "./divider-block";
import { EmbedBlock } from "./embed-block";
import { FooterActions } from "./footer-actions";
import { HeaderBlock } from "./header-block";
import { ImageBlock } from "./image-block";
import { LinkBlock } from "./link-block";
import { LocationBlock } from "./location-block";
import { usePreview } from "./preview-context";
import { type PrivacyNotice, PrivacyNoticeLink, resolvePrivacyNotice } from "./privacy-notice";
import { ProfileSocialIcons } from "./profile-social-icons";
import type { ThemeColors } from "./public-page";
import { ShaderBanner } from "./shader-banner";
import { TextBlock } from "./text-block";
import { VCardBlock } from "./vcard-block";
import { WhitelabelFooter } from "./whitelabel-footer";

interface SocialNetwork {
	slug: string;
	name: string;
	url: string;
	hex: string;
	svgPath: string;
}

interface PageContentProps {
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
	socialNetworks?: SocialNetwork[];
	settings: {
		brandingEnabled: boolean;
		brandingText: string;
		vcardEnabled?: boolean;
		/** See PublicPage's PageData: the footer vCard download has data to serve. */
		vcardDownloadAvailable?: boolean;
		contactFormEnabled?: boolean;
		captchaProvider?: string;
		captchaSiteKey?: string | null;
		bannerPreset: string | null;
		bannerEnabled: boolean;
		bannerMode?: "preset" | "custom";
		bannerCustomUrl?: string | null;
		customCss?: string | null;
		/** Privacy policy link (url mode only) … */
		brandingPpUrl?: string | null;
		/** … or its text (text mode only), shown in a dialog. */
		brandingPpText?: string | null;
		/** Footer branding link (http/https only). */
		brandingLink?: string | null;
		socialIconShape?: "circle" | "rounded-square" | null;
		/** Consent banner on: embeds wait for consent and the footer offers "Cookie settings". */
		consentBannerEnabled?: boolean;
	};
	themeColors: ThemeColors;
	colorMode: "light" | "dark";
}

/** Origins the preview's custom CSS may load assets from (this app + the API). */
function previewAssetOrigins(): Set<string> {
	const origins = new Set<string>();
	if (typeof window !== "undefined") origins.add(window.location.origin);
	try {
		if (process.env.NEXT_PUBLIC_SERVER_URL)
			origins.add(new URL(process.env.NEXT_PUBLIC_SERVER_URL).origin);
	} catch {
		// Malformed env — same-origin only.
	}
	return origins;
}

/** A block's config object; {} for anything that isn't a plain JSON object. */
function parseConfig(config: string | null): Record<string, unknown> {
	if (!config) return {};
	try {
		const v: unknown = JSON.parse(config);
		return v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {};
	} catch {
		return {};
	}
}

type Block = PageContentProps["blocks"][number];
type SectionLayout = "list" | "grid" | "carousel";

interface Section {
	header: Block | null;
	layout: SectionLayout;
	blocks: Block[];
	/** Entrance index of the section's first element (header or block), page-wide. */
	start: number;
}

/**
 * A header block starts a new section; its `config.layout` drives the container
 * of every block after it until the next header. Blocks before the first header
 * form a plain list section.
 */
function groupSections(blocks: Block[]): Section[] {
	const sections: Section[] = [];
	let current: Section = { header: null, layout: "list", blocks: [], start: 0 };
	for (const [i, b] of blocks.entries()) {
		if (b.type === "header") {
			if (current.header || current.blocks.length) sections.push(current);
			const layout = parseConfig(b.config).layout;
			current = {
				header: b,
				layout: layout === "grid" || layout === "carousel" ? layout : "list",
				blocks: [],
				start: i,
			};
		} else {
			current.blocks.push(b);
		}
	}
	if (current.header || current.blocks.length) sections.push(current);
	return sections;
}

const sectionLayoutClass: Record<SectionLayout, string> = {
	list: "space-y-3",
	grid: "grid grid-cols-2 gap-3",
	carousel:
		"flex gap-3 overflow-x-auto snap-x snap-mandatory rounded-xl pb-2 focus-visible:outline-2 focus-visible:outline-offset-2 [&>*]:min-w-[72%] [&>*]:snap-start [&>*]:shrink-0",
};

function renderBlock(
	blockData: Block,
	{
		colorMode,
		themeColors,
		settings,
		tile,
	}: {
		colorMode: "light" | "dark";
		themeColors: ThemeColors;
		settings: PageContentProps["settings"];
		/** Inside a grid section: links render as square tiles. */
		tile?: boolean;
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
					tile={tile}
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
					consentRequired={settings.consentBannerEnabled !== false}
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
					privacyNotice={resolvePrivacyNotice(settings.brandingPpUrl, settings.brandingPpText)}
					captchaProvider={settings.captchaProvider}
					captchaSiteKey={settings.captchaSiteKey}
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
		case "image":
			return (
				<ImageBlock
					key={blockData.id}
					block={blockData}
					config={config}
					colorMode={colorMode}
					themeColors={themeColors}
				/>
			);
		case "text":
			return (
				<TextBlock
					key={blockData.id}
					block={blockData}
					config={config}
					colorMode={colorMode}
					themeColors={themeColors}
				/>
			);
		case "divider":
			return (
				<DividerBlock
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
	// The footer pill only when /api/vcard has something to serve: the page's
	// own vCard block renders its button instead, and with no block the API
	// falls back to the global vCard — when getPage says there is one.
	const showFooterVcard =
		!hasVcardBlock && (settings.vcardDownloadAvailable ?? !!settings.vcardEnabled);
	const showConsentLink = !isPreview && settings.consentBannerEnabled === true;
	// Always reachable from the footer, whichever mode the policy is published in.
	const privacyNotice: PrivacyNotice | null = resolvePrivacyNotice(
		settings.brandingPpUrl,
		settings.brandingPpText,
	);
	const showLegalRow = showConsentLink || !!privacyNotice;
	const sections = groupSections(contentBlocks);

	// Project resolved theme into CSS variables so shared @linkden/ui components
	// (which read var(--ld-*)) inherit the live theme without prop threading.
	// `.ld-page` paints `--ld-background` + the ambient glow itself (index.css).
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
		// Signal line in the page's own palette (the admin token uses brand colors).
		"--signal": "linear-gradient(90deg, var(--ld-primary), var(--ld-secondary))",
		color: themeColors.fg,
		transition: "background-color 0.5s ease, color 0.5s ease",
	} as React.CSSProperties;

	// Derive the hero surface from resolved theme values so the card reads as a
	// solid, tappable panel over a flat background (no blur backdrop to rely on).
	const heroCardStyle: React.CSSProperties = {
		backgroundColor: themeColors.card,
		// The name/bio sit on the card, so they take the card's foreground (fg
		// is only guaranteed against the page background).
		color: themeColors.cardFg,
		borderColor: themeColors.border,
		boxShadow: `0 12px 32px -16px ${themeColors.primary}33`,
		transition: "background-color 0.5s ease, border-color 0.5s ease",
	};

	const coverPreset =
		showCover && settings.bannerMode !== "custom"
			? getPresetById(settings.bannerPreset || "", themeColors)
			: null;

	return (
		<div
			className={isPreview ? "ld-page flex min-h-full flex-col" : "ld-page flex min-h-dvh flex-col"}
			style={cssVarStyle}
		>
			{settings.customCss && (
				// The preview runs inside the admin document: scoped + no external fetches.
				<style>
					{isPreview
						? previewCustomCss(settings.customCss, previewAssetOrigins())
						: liveCustomCss(settings.customCss)}
				</style>
			)}

			{/* Container query (not viewport): the 512px admin preview stays single
			    column while the live page goes two-column from 896px. */}
			<Wrapper
				{...(!isPreview ? { id: "main-content", role: "main" } : {})}
				className="mx-auto w-full max-w-lg px-4 py-8 @4xl:grid @4xl:max-w-5xl @4xl:grid-cols-[360px_minmax(0,1fr)] @4xl:items-start @4xl:gap-10"
			>
				{/* Hero card: cover + avatar + name + bio + socials */}
				<ProfileWrapper
					className="ld-hero ld-profile relative mb-6 overflow-hidden rounded-3xl border shadow-lg shadow-black/5 backdrop-blur-2xl @4xl:sticky @4xl:top-8 @4xl:mb-0"
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
									{coverPreset.type === "shader" && (
										<ShaderBanner preset={coverPreset} showPauseControl={!isPreview} />
									)}
								</div>
							) : null}
						</div>
					)}

					<div className={`ld-hero-body px-6 pb-7 text-center ${showCover ? "-mt-12" : "pt-8"}`}>
						<Avatar
							src={profile.image}
							name={profile.name}
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

						<h1 className="mt-4 inline-flex items-center justify-center gap-1.5 text-h1 font-bold">
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
						{/* Signal line — the brand's signature mark, in the page palette. */}
						<span
							aria-hidden="true"
							className="mx-auto mt-3 block h-0.5 w-10 rounded-full bg-[image:var(--signal)]"
						/>

						{profile.bio && (
							<p
								className="ld-bio mx-auto mt-3 max-w-sm text-body"
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

				<div className="min-w-0">
					{sections.length === 0 && (
						<div
							className="rounded-2xl px-6 py-10 text-center text-small"
							style={{ backgroundColor: themeColors.muted, color: themeColors.mutedFg }}
						>
							<p>Nothing here yet.</p>
							{isPreview && <p className="mt-1">Add blocks in the builder.</p>}
						</div>
					)}

					{/* One entrance mechanism: `.ld-blocks > *` rises with a delay of
					    `--ld-i` × 45ms (index.css). The index runs across sections and
					    caps at 12 so a long page doesn't keep the fold waiting. */}
					<div className="space-y-6 pb-8">
						{sections.map((section) => {
							const tile = section.layout === "grid";
							const firstBlock = section.start + (section.header ? 1 : 0);
							return (
								<section key={section.header?.id ?? "lead"} className="space-y-3">
									{section.header && (
										<div
											className="ld-blocks"
											style={{ "--ld-i": Math.min(section.start, 12) } as React.CSSProperties}
										>
											{renderBlock(section.header, { colorMode, themeColors, settings })}
										</div>
									)}
									{section.blocks.length > 0 &&
										(section.layout === "carousel" ? (
											<Carousel
												themeColors={themeColors}
												label={section.header?.title || "Links and content"}
											>
												{(listRef) => (
													<ul
														ref={listRef}
														className={`ld-blocks ${sectionLayoutClass[section.layout]}`}
														aria-label={
															section.layout === "carousel"
																? `${section.header?.title || "Links and content"}, scrollable`
																: section.header?.title || "Links and content"
														}
														// A carousel of non-interactive blocks (images without a link,
														// text, dividers) has nothing focusable inside it; making the
														// scroller itself a tab stop lets the arrow keys scroll it in
														// every browser (Safari does not focus overflow boxes on its own).
														tabIndex={section.layout === "carousel" ? 0 : undefined}
														style={
															section.layout === "carousel"
																? ({ outlineColor: themeColors.primary } as React.CSSProperties)
																: undefined
														}
													>
														{section.blocks.map((blockData, i) => (
															// The wrapper <li> owns both the list semantics and the
															// stagger index, so each block renders a plain <a>/<div>.
															<li
																key={blockData.id}
																style={
																	{ "--ld-i": Math.min(firstBlock + i, 12) } as React.CSSProperties
																}
															>
																{renderBlock(blockData, { colorMode, themeColors, settings, tile })}
															</li>
														))}
													</ul>
												)}
											</Carousel>
										) : (
											<ul
												className={`ld-blocks ${sectionLayoutClass[section.layout]}`}
												aria-label={section.header?.title || "Links and content"}
											>
												{section.blocks.map((blockData, i) => (
													<li
														key={blockData.id}
														style={
															{ "--ld-i": Math.min(firstBlock + i, 12) } as React.CSSProperties
														}
													>
														{renderBlock(blockData, { colorMode, themeColors, settings, tile })}
													</li>
												))}
											</ul>
										))}
								</section>
							);
						})}
					</div>

					{!isPreview && <FooterActions vcardEnabled={showFooterVcard} themeColors={themeColors} />}
				</div>
			</Wrapper>

			{(settings.brandingEnabled || showLegalRow) && (
				<div className="mt-auto">
					{showLegalRow && (
						<div
							className={`flex flex-wrap items-center justify-center gap-x-2 ${settings.brandingEnabled ? "pt-6" : "pt-6 pb-6"}`}
						>
							{privacyNotice && (
								<PrivacyNoticeLink
									notice={privacyNotice}
									themeColors={themeColors}
									className="ld-privacy-link inline-flex min-h-11 items-center px-3 text-xs underline underline-offset-2 hover:opacity-80 focus-visible:outline-2 focus-visible:outline-offset-2"
									style={{ color: themeColors.mutedFg, outlineColor: themeColors.primary }}
								>
									Privacy
								</PrivacyNoticeLink>
							)}
							{showConsentLink && (
								// Withdrawing or changing consent must be as easy as giving it.
								<button
									type="button"
									onClick={openConsentPreferences}
									className="ld-consent-settings min-h-11 px-3 text-xs underline underline-offset-2 hover:opacity-80 focus-visible:outline-2 focus-visible:outline-offset-2"
									style={{ color: themeColors.mutedFg, outlineColor: themeColors.primary }}
								>
									Cookie settings
								</button>
							)}
						</div>
					)}
					{settings.brandingEnabled && (
						<WhitelabelFooter
							text={settings.brandingText}
							link={settings.brandingLink}
							mutedFg={themeColors.mutedFg}
							profileName={profile.name}
						/>
					)}
				</div>
			)}
		</div>
	);
}

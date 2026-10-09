"use client";

// ─── Embed Block ───────────────────────────────────────────────────────────
// Security model for embedded content:
//   - Known providers (YouTube, Spotify, SoundCloud) are parsed and rewritten
//     to their official embed endpoints. This guarantees a safe origin since
//     the URL is constructed from a regex match, not passed through raw.
//   - Custom embeds must use https: protocol — javascript:, data:, and http:
//     are rejected. The iframe also has sandbox="allow-scripts allow-same-origin"
//     which restricts the embed from navigating the top frame, submitting forms,
//     or accessing APIs it shouldn't.
//   - In preview mode, no iframe is rendered at all — just a placeholder div.
//
// Privacy: loading the iframe sends the visitor's IP and this page to the
// provider and runs its scripts. With the consent banner on, the iframe waits
// for consent — the visitor allowed "Embedded media" (the `functional`
// category) or clicks "Load" on this embed. With the banner off, it loads
// straight away as before.

import { getReadableTextColor } from "@linkden/ui/color-contrast";
import { getEmbedSrc } from "@linkden/validators/embed";
import { useEffect, useState } from "react";
import { hasConsent, onConsentChange } from "./consent-banner";
import { usePreview } from "./preview-context";

interface EmbedBlockProps {
	block: {
		id: string;
		title: string | null;
		embedType: string | null;
		embedUrl: string | null;
	};
	config: Record<string, unknown>;
	colorMode: "light" | "dark";
	themeColors?: {
		muted?: string;
		mutedFg?: string;
		primary?: string;
	};
	/** The consent banner is on, so the iframe waits for consent (default true). */
	consentRequired?: boolean;
}

const aspectRatioClasses: Record<string, string> = {
	"16:9": "aspect-video",
	"4:3": "aspect-[4/3]",
	"1:1": "aspect-square",
};

const maxWidthClasses: Record<string, string> = {
	sm: "max-w-sm",
	md: "max-w-md",
	lg: "max-w-lg",
	full: "max-w-full",
};

const PROVIDER_NAMES: Record<string, string> = {
	youtube: "YouTube",
	spotify: "Spotify",
	soundcloud: "SoundCloud",
};

function hostOf(src: string): string {
	try {
		return new URL(src).hostname;
	} catch {
		return "a third-party site";
	}
}

/** Whether third-party embeds may load right now (see the privacy note above). */
function useEmbedConsent(required: boolean): [boolean, () => void] {
	// Banner off: no gate, render the iframe from the server HTML on. Otherwise
	// SSR and the first client render agree on "not yet" and the effect reads
	// the stored choice, so hydration never mismatches.
	const [allowed, setAllowed] = useState(!required);
	useEffect(() => {
		if (!required) return;
		if (hasConsent("functional", true)) setAllowed(true);
		// Follow every choice, not just a grant: choosing "Essential only" later
		// must unmount the third-party iframe and restore the click-to-load card.
		return onConsentChange((consent) => setAllowed(Boolean(consent.functional)));
	}, [required]);
	return [allowed || !required, () => setAllowed(true)];
}

export function EmbedBlock({
	block,
	config,
	colorMode,
	themeColors,
	consentRequired = true,
}: EmbedBlockProps) {
	const { isPreview } = usePreview();
	const [consented, loadNow] = useEmbedConsent(consentRequired);
	const aspectRatio = (config.aspectRatio as string) || "16:9";
	const maxWidth = (config.maxWidth as string) || "full";
	const showTitle = config.showTitle !== false;

	const src = getEmbedSrc(block.embedType, block.embedUrl);

	if (!src) return null;

	const placeholderStyle: React.CSSProperties = {
		backgroundColor: themeColors?.muted || (colorMode === "dark" ? "#1f2937" : "#f3f4f6"),
		color: themeColors?.mutedFg || (colorMode === "dark" ? "#9ca3af" : "#6b7280"),
		transition: "background-color 0.5s ease, color 0.5s ease",
	};
	const providerName = block.embedType ? PROVIDER_NAMES[block.embedType] : undefined;
	const primary = themeColors?.primary || "#2563eb";

	return (
		<div className={`ld-embed-block mx-auto ${maxWidthClasses[maxWidth] || "max-w-full"}`}>
			{showTitle && block.title && (
				<h3
					className="mb-2 text-sm font-medium"
					style={{
						color: themeColors?.mutedFg || (colorMode === "dark" ? "#d1d5db" : "#374151"),
						transition: "color 0.5s ease",
					}}
				>
					{block.title}
				</h3>
			)}
			<div
				className={`overflow-hidden rounded-lg ${
					aspectRatioClasses[aspectRatio] || "aspect-video"
				}`}
			>
				{isPreview ? (
					<div
						className="flex h-full w-full items-center justify-center text-xs"
						style={placeholderStyle}
					>
						{block.embedType ? `${block.embedType} embed` : "Embed"}
					</div>
				) : consented ? (
					<iframe
						src={src}
						className="h-full w-full"
						allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
						allowFullScreen
						loading="lazy"
						title={block.title || "Embedded content"}
						sandbox="allow-scripts allow-same-origin"
					/>
				) : (
					<div
						className="flex h-full w-full flex-col items-center justify-center gap-3 p-4 text-center"
						style={placeholderStyle}
					>
						<p className="text-small">
							{providerName ? `This ${providerName} content` : "This content"} loads from{" "}
							{hostOf(src)}, which receives your IP address.
						</p>
						<button
							type="button"
							onClick={loadNow}
							className="min-h-11 rounded-lg px-4 py-2 text-small font-medium hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-2"
							style={{
								backgroundColor: primary,
								color: getReadableTextColor(primary),
								outlineColor: primary,
							}}
						>
							Load {providerName ?? "embed"}
						</button>
					</div>
				)}
			</div>
		</div>
	);
}

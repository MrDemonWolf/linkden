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

import { getEmbedSrc } from "@linkden/validators/blocks";
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
	};
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

export function EmbedBlock({ block, config, colorMode, themeColors }: EmbedBlockProps) {
	const { isPreview } = usePreview();
	const aspectRatio = (config.aspectRatio as string) || "16:9";
	const maxWidth = (config.maxWidth as string) || "full";
	const showTitle = config.showTitle !== false;

	const src = getEmbedSrc(block.embedType, block.embedUrl);

	if (!src) return null;

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
						style={{
							backgroundColor: themeColors?.muted || (colorMode === "dark" ? "#1f2937" : "#f3f4f6"),
							color: themeColors?.mutedFg || (colorMode === "dark" ? "#9ca3af" : "#6b7280"),
							transition: "background-color 0.5s ease, color 0.5s ease",
						}}
					>
						{block.embedType ? `${block.embedType} embed` : "Embed"}
					</div>
				) : (
					<iframe
						src={src}
						className="h-full w-full"
						allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
						allowFullScreen
						loading="lazy"
						title={block.title || "Embedded content"}
						sandbox="allow-scripts allow-same-origin"
					/>
				)}
			</div>
		</div>
	);
}

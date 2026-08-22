"use client";

import { ExternalLink, MapPin } from "lucide-react";
import { getMapUrl } from "@/lib/map-url";
import { trackClick } from "@/lib/track";
import { usePreview } from "./preview-context";
import type { ThemeColors } from "./public-page";

interface LocationBlockProps {
	block: {
		id: string;
		title: string | null;
		url: string | null;
		icon: string | null;
	};
	config: Record<string, unknown>;
	colorMode: "light" | "dark";
	themeColors?: ThemeColors;
}

export function LocationBlock({ block, config, themeColors }: LocationBlockProps) {
	const { isPreview } = usePreview();
	const address = (config.address as string) || block.title || "";
	const linkType = (config.linkType as string) || "none";
	const customLinkUrl = config.customLinkUrl as string | undefined;
	const coordinates = config.coordinates as { lat: number; lng: number } | undefined;

	if (!address) return null;

	const mapUrl = getMapUrl(linkType, address, coordinates, customLinkUrl);

	const content = (
		<span className="inline-flex items-center gap-1.5">
			<MapPin
				className="h-4 w-4 shrink-0"
				style={{ color: themeColors?.mutedFg }}
				aria-hidden="true"
			/>
			<span>{address}</span>
		</span>
	);

	const style: React.CSSProperties = {
		color: themeColors?.mutedFg,
		transition: "color 0.5s ease",
	};

	if (mapUrl) {
		return (
			<div className="ld-location-block flex justify-center py-1">
				<a
					href={isPreview ? undefined : mapUrl}
					target={isPreview ? undefined : "_blank"}
					rel={isPreview ? undefined : "noopener noreferrer"}
					onClick={(e: React.MouseEvent) => {
						if (isPreview) e.preventDefault();
						trackClick(block.id, { preview: isPreview });
					}}
					className="inline-flex min-h-11 items-center gap-1.5 rounded-lg px-3 py-2 text-small underline decoration-dotted underline-offset-4 transition-opacity hover:opacity-80 focus-visible:outline-2 focus-visible:outline-offset-2"
					style={{ ...style, outlineColor: themeColors?.primary || "#3b82f6" }}
				>
					{content}
					{/* Persistent affordance so a linked address is visibly distinct from a static one */}
					<ExternalLink className="h-3.5 w-3.5 shrink-0 opacity-70" aria-hidden="true" />
				</a>
			</div>
		);
	}

	return (
		<div className="ld-location-block flex min-h-11 items-center justify-center py-1">
			<span className="text-small" style={style}>
				{content}
			</span>
		</div>
	);
}

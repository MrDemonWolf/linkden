"use client";

import { MapPin } from "lucide-react";
import { getMapUrl } from "@/lib/map-url";
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

export function LocationBlock({ block, config, colorMode, themeColors }: LocationBlockProps) {
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
			<div role="listitem" className="ld-location-block flex justify-center py-1">
				<a
					href={mapUrl}
					target="_blank"
					rel="noopener noreferrer"
					className="text-sm hover:underline"
					style={style}
				>
					{content}
				</a>
			</div>
		);
	}

	return (
		<div role="listitem" className="ld-location-block flex justify-center py-1">
			<span className="text-sm" style={style}>
				{content}
			</span>
		</div>
	);
}

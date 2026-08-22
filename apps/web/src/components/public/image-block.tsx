"use client";

import { trackClick } from "@/lib/track";
import { usePreview } from "./preview-context";
import type { ThemeColors } from "./public-page";

interface ImageBlockProps {
	block: {
		id: string;
		title: string | null;
		url: string | null;
	};
	config: Record<string, unknown>;
	colorMode: "light" | "dark";
	themeColors: ThemeColors;
}

const aspectClasses: Record<string, string> = {
	"16:9": "aspect-video",
	"1:1": "aspect-square",
	"4:5": "aspect-[4/5]",
	auto: "",
};

export function ImageBlock({ block, config, themeColors }: ImageBlockProps) {
	const { isPreview } = usePreview();
	const src = config.src as string | undefined;
	if (!src) return null;
	const alt = (config.alt as string) || block.title || "";
	const caption = config.caption as string | undefined;
	const aspect = aspectClasses[(config.aspect as string) || "auto"] ?? "";

	const picture = (
		<span
			className={`block overflow-hidden rounded-xl border shadow-card ${aspect}`}
			style={{ borderColor: themeColors.border }}
		>
			<img src={src} alt={alt} loading="lazy" className="h-full w-full object-cover" />
		</span>
	);

	return (
		<figure className="ld-image-block">
			{block.url ? (
				<a
					href={block.url}
					target="_blank"
					rel="noopener noreferrer"
					onClick={(e) => {
						if (isPreview) e.preventDefault();
						trackClick(block.id, { preview: isPreview });
					}}
					className="block rounded-xl transition-transform duration-[220ms] ease-out hover:-translate-y-px active:scale-[.985] focus-visible:outline-2 focus-visible:outline-offset-2"
					style={{ outlineColor: themeColors.primary }}
				>
					{picture}
				</a>
			) : (
				picture
			)}
			{caption && (
				<figcaption className="mt-2 text-center text-small" style={{ color: themeColors.mutedFg }}>
					{caption}
				</figcaption>
			)}
		</figure>
	);
}

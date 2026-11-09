"use client";

import { safeHttpUrl, safeImageSrc } from "@/lib/safe-url";
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

const aspectRatios: Record<string, string> = {
	"16:9": "16 / 9",
	"1:1": "1 / 1",
	"4:5": "4 / 5",
};

export function ImageBlock({ block, config, themeColors }: ImageBlockProps) {
	const { isPreview } = usePreview();
	const src = safeImageSrc(config.src);
	if (!src) return null;
	const href = safeHttpUrl(block.url);
	const alt = (config.alt as string) || block.title || "";
	const caption = config.caption as string | undefined;
	const aspectRatio =
		typeof config.aspect === "string" && Object.hasOwn(aspectRatios, config.aspect)
			? aspectRatios[config.aspect]
			: undefined;
	const fit = config.fit === "cover" ? "cover" : "contain";
	// A link whose only content is an image is named by its alt text; without
	// one, name it from the caption or the destination host (WCAG 2.4.4).
	const linkLabel = href && !alt ? caption || `Open ${new URL(href).hostname}` : undefined;

	const picture = (
		<span
			className="relative block min-w-0 w-full overflow-hidden rounded-xl border shadow-card"
			style={{
				borderColor: themeColors.border,
				backgroundColor: themeColors.card,
				aspectRatio,
			}}
		>
			<img
				src={src}
				alt={alt}
				loading="lazy"
				className={aspectRatio ? "absolute inset-0 block h-full w-full" : "block h-auto w-full"}
				style={{ objectFit: fit }}
			/>
		</span>
	);

	return (
		<figure className="ld-image-block min-w-0 w-full">
			{href ? (
				<a
					href={href}
					target="_blank"
					rel="noopener noreferrer"
					aria-label={linkLabel}
					onClick={(e) => {
						if (isPreview) e.preventDefault();
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

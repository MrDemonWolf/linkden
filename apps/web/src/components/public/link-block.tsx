"use client";

import { getReadableTextColor } from "@linkden/ui/color-contrast";
import { ArrowRight } from "lucide-react";
import { safeHttpUrl } from "@/lib/safe-url";
import { trackClick } from "@/lib/track";
import { BlockIcon } from "./block-icon";
import { usePreview } from "./preview-context";
import type { ThemeColors } from "./public-page";

interface LinkBlockProps {
	block: {
		id: string;
		title: string | null;
		url: string | null;
		icon: string | null;
	};
	config: Record<string, unknown>;
	colorMode: "light" | "dark";
	themeColors: ThemeColors;
	/** Grid-section tile: square thumbnail/icon above a centered title. */
	tile?: boolean;
}

const radiusClasses: Record<string, string> = {
	none: "rounded-none",
	sm: "rounded-sm",
	md: "rounded-md",
	lg: "rounded-lg",
	xl: "rounded-xl",
	"2xl": "rounded-2xl",
	full: "rounded-full",
};

const textAlignClasses: Record<string, string> = {
	left: "text-left",
	center: "text-center",
	right: "text-right",
};

// Hover border/glow read CSS vars that the anchor sets inline (see `vars`), so
// the same markup works in the admin preview, which renders outside `.ld-page`.
const CARD =
	"ld-link-block group relative w-full border shadow-card backdrop-blur-xl transition-[transform,border-color,box-shadow,background-color,color] duration-[220ms] ease-out hover:-translate-y-px hover:border-(--ld-primary) hover:shadow-(--ld-glow) active:scale-[.985] focus-visible:outline-2 focus-visible:outline-offset-2";

/**
 * Signal accent: grows from the left edge on hover. Parent needs `group` +
 * `overflow-hidden`. primary→accent rather than →secondary: every preset's
 * `--ld-secondary` is a surface tint, not a second hue.
 */
function Accent({ colors }: { colors: ThemeColors }) {
	return (
		<span
			aria-hidden="true"
			className="pointer-events-none absolute left-0 top-1/2 h-0 w-0.5 -translate-y-1/2 rounded-r-full transition-[height] duration-[220ms] ease-out group-hover:h-6"
			style={{ backgroundImage: `linear-gradient(${colors.primary}, ${colors.accent})` }}
		/>
	);
}

export function LinkBlock({ block, config, themeColors: colors, tile }: LinkBlockProps) {
	const { isPreview } = usePreview();

	const title = block.title || "Untitled Link";
	const emoji = config.emoji as string | undefined;
	const emojiPosition = (config.emojiPosition as string) || "left";
	const textAlign = (config.textAlign as string) || "center";
	const description = config.description as string | undefined;
	const thumbnail = safeHttpUrl(config.thumbnail) ?? undefined;
	const variant = (config.variant as string) || (thumbnail ? "thumbnail" : "classic");
	const isHighlighted = config.isHighlighted as boolean | undefined;
	const isOutlined = config.isOutlined as boolean | undefined;
	const customBgColor = config.customBgColor as string | undefined;
	const radius = radiusClasses[(config.borderRadius as string) || "2xl"] || "rounded-2xl";
	const newTab = config.newTab !== false;

	const handleClick = (e: React.MouseEvent) => {
		if (isPreview) e.preventDefault();
		trackClick(block.id, { preview: isPreview });
	};

	// Solid surface + its readable text. White-on-bright-primary fails contrast
	// (1.37–2.58:1), so highlighted/custom surfaces pick the legible one.
	const surface = isHighlighted ? colors.primary : customBgColor || colors.card;
	const ink = isHighlighted
		? getReadableTextColor(colors.primary)
		: customBgColor
			? (config.customTextColor as string) || getReadableTextColor(customBgColor)
			: isOutlined
				? colors.fg
				: colors.cardFg;
	const descriptionColor = isHighlighted || customBgColor ? ink : colors.mutedFg;

	const vars = {
		"--ld-primary": colors.primary,
		"--ld-glow": `0 0 0 1px color-mix(in srgb, ${colors.primary} 30%, transparent), 0 14px 40px -16px color-mix(in srgb, ${colors.primary} 40%, transparent)`,
		outlineColor: colors.primary,
	} as React.CSSProperties;
	const cardStyle: React.CSSProperties = {
		...vars,
		backgroundColor: isOutlined
			? "transparent"
			: isHighlighted || customBgColor
				? surface
				: `color-mix(in srgb, ${surface} 85%, transparent)`,
		borderColor: isHighlighted ? colors.primary : colors.border,
		color: ink,
	};

	const anchorProps = {
		href: safeHttpUrl(block.url) ?? "#",
		target: newTab ? "_blank" : undefined,
		rel: config.noFollow ? "noopener noreferrer nofollow" : "noopener noreferrer",
		onClick: handleClick,
	};

	const iconOrEmoji = block.icon ? (
		<BlockIcon icon={block.icon} />
	) : emoji && emojiPosition === "left" ? (
		<span className="text-xl leading-none" aria-hidden="true">
			{emoji}
		</span>
	) : null;

	// ── Featured: 16:9 cover, title as a solid pill over the bottom-left edge ──
	if (variant === "featured" && thumbnail && !tile) {
		return (
			<a
				{...anchorProps}
				className="ld-link-block group block w-full rounded-2xl transition-transform duration-[220ms] ease-out hover:-translate-y-px active:scale-[.985] focus-visible:outline-2 focus-visible:outline-offset-2"
				style={vars}
			>
				<span className="relative block">
					<span
						className="relative block overflow-hidden rounded-2xl border shadow-card transition-[border-color,box-shadow] duration-[220ms] ease-out group-hover:border-(--ld-primary) group-hover:shadow-(--ld-glow)"
						style={{ borderColor: colors.border }}
					>
						{/* alt="" — the pill below names the link; a title alt would read twice. */}
						<img
							src={thumbnail}
							alt=""
							loading="lazy"
							className="aspect-video w-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.02]"
						/>
						<Accent colors={colors} />
					</span>
					<span
						className="absolute -bottom-3 left-3 inline-flex min-h-11 max-w-[calc(100%-1.5rem)] items-center gap-2 rounded-pill px-4 text-body font-semibold shadow-card"
						style={{ backgroundColor: surface, color: ink }}
					>
						{iconOrEmoji}
						<span className="truncate">{title}</span>
					</span>
				</span>
				{description && (
					<span
						className="mt-5 block px-1 text-small line-clamp-2"
						style={{ color: colors.mutedFg }}
					>
						{description}
					</span>
				)}
			</a>
		);
	}

	// ── Tile (grid sections): square thumbnail / icon above a centered title ──
	if (tile) {
		return (
			<a
				{...anchorProps}
				className={`${CARD} flex h-full min-h-11 flex-col items-center gap-2 overflow-hidden p-3 text-center ${radius}`}
				style={cardStyle}
			>
				<Accent colors={colors} />
				{thumbnail ? (
					<img
						src={thumbnail}
						alt=""
						loading="lazy"
						className="aspect-square w-full rounded-xl object-cover"
					/>
				) : (
					iconOrEmoji && (
						<span
							className="flex h-11 w-11 items-center justify-center rounded-xl"
							style={{ backgroundColor: isHighlighted ? "transparent" : colors.muted }}
						>
							{iconOrEmoji}
						</span>
					)
				)}
				<span className="line-clamp-2 text-small font-semibold">{title}</span>
				{description && (
					<span className="line-clamp-1 text-micro" style={{ color: descriptionColor }}>
						{description}
					</span>
				)}
			</a>
		);
	}

	// ── Classic / thumbnail row: 60px card, 44×44 leading slot, trailing arrow ──
	const lead =
		variant === "thumbnail" && thumbnail ? (
			<img src={thumbnail} alt="" loading="lazy" className="h-11 w-11 rounded-md object-cover" />
		) : (
			iconOrEmoji
		);
	const trail =
		emoji && emojiPosition === "right" ? (
			<span className="text-xl leading-none" aria-hidden="true">
				{emoji}
			</span>
		) : (
			<ArrowRight
				className="h-5 w-5 opacity-40 transition-[opacity,transform] duration-[220ms] ease-out group-hover:translate-x-0.5 group-hover:opacity-80"
				aria-hidden="true"
			/>
		);

	return (
		<a
			{...anchorProps}
			className={`${CARD} flex min-h-[60px] items-center gap-3 overflow-hidden py-2 pl-3 pr-2 ${radius}`}
			style={cardStyle}
		>
			<Accent colors={colors} />
			{lead ? (
				<span className="flex h-11 w-11 shrink-0 items-center justify-center">{lead}</span>
			) : (
				// Balance the trailing 44px slot so a centered title is truly centered.
				textAlign === "center" && <span className="w-11 shrink-0" aria-hidden="true" />
			)}
			<span className={`min-w-0 flex-1 ${textAlignClasses[textAlign] || "text-center"}`}>
				<span className="block truncate text-body font-semibold">{title}</span>
				{description && (
					<span
						className="line-clamp-1 block text-small font-normal"
						style={{ color: descriptionColor }}
						title={description}
					>
						{description}
					</span>
				)}
			</span>
			<span className="flex h-11 w-11 shrink-0 items-center justify-center">{trail}</span>
		</a>
	);
}

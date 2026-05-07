"use client";

import { useMutation } from "@tanstack/react-query";
import { ArrowRight } from "lucide-react";
import { trpc } from "@/utils/trpc";
import type { ThemeColors } from "./public-page";
import { usePreview } from "./preview-context";

interface LinkBlockProps {
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

const animationClasses: Record<string, string> = {
	fade: "animate-[fadeIn_0.5s_ease-in-out]",
	slide: "animate-[slideIn_0.3s_ease-out]",
	bounce: "hover:animate-[bounce_0.3s]",
	pulse: "hover:animate-pulse",
};

export function LinkBlock({ block, config, colorMode, themeColors }: LinkBlockProps) {
	const { isPreview } = usePreview();
	const trackClick = useMutation(trpc.public.trackClick.mutationOptions());

	const handleClick = (e: React.MouseEvent) => {
		if (isPreview) {
			e.preventDefault();
			return;
		}
		trackClick.mutate({
			blockId: block.id,
			referrer: document.referrer || undefined,
			userAgent: navigator.userAgent || undefined,
		});
	};

	const emoji = config.emoji as string | undefined;
	const emojiPosition = (config.emojiPosition as string) || "left";
	const textAlign = (config.textAlign as string) || "center";
	const isOutlined = config.isOutlined as boolean | undefined;
	const openInNewTab = config.openInNewTab !== false;
	const animation = config.animation as string | undefined;
	const borderRadius = (config.borderRadius as string) || "2xl";
	const shadow = config.shadow as string | undefined;
	const customBgColor = config.customBgColor as string | undefined;
	const customTextColor = config.customTextColor as string | undefined;
	const description = config.description as string | undefined;
	const thumbnail = config.thumbnail as string | undefined;
	const isHighlighted = config.isHighlighted as boolean | undefined;

	const hasRichContent = !!(description || thumbnail);

	const radiusClasses: Record<string, string> = {
		none: "rounded-none",
		sm: "rounded-sm",
		md: "rounded-md",
		lg: "rounded-lg",
		xl: "rounded-xl",
		"2xl": "rounded-2xl",
		full: "rounded-full",
	};

	const shadowClasses: Record<string, string> = {
		none: "",
		sm: "shadow-sm",
		md: "shadow-md",
		lg: "shadow-lg",
	};

	const textAlignClasses: Record<string, string> = {
		left: "text-left",
		center: "text-center",
		right: "text-right",
	};

	const effectiveTextAlign = hasRichContent ? "left" : textAlign;

	const justifyClasses: Record<string, string> = {
		left: "justify-start",
		center: "justify-center",
		right: "justify-end",
	};

	const baseClasses = hasRichContent
		? `group block w-full px-6 py-5 font-semibold tracking-wide transition-all duration-300 hover:-translate-y-0.5 ${
				radiusClasses[borderRadius] || "rounded-2xl"
			} ${shadowClasses[shadow || "none"]} ${
				textAlignClasses[effectiveTextAlign] || "text-center"
			} ${animation && animationClasses[animation] ? animationClasses[animation] : ""}`
		: `group relative flex items-center w-full py-4 px-6 font-semibold tracking-wide transition-all duration-300 hover:-translate-y-0.5 ${
				justifyClasses[textAlign] || "justify-center"
			} ${radiusClasses[borderRadius] || "rounded-2xl"} ${shadowClasses[shadow || "none"]} ${animation && animationClasses[animation] ? animationClasses[animation] : ""}`;

	const style: React.CSSProperties = {
		transition:
			"background-color 0.5s ease, color 0.5s ease, border-color 0.5s ease, transform 0.3s cubic-bezier(0.4,0,0.2,1)",
	};

	if (isHighlighted && themeColors) {
		style.backgroundColor = themeColors.primary;
		style.color = "#ffffff";
		style.boxShadow = `0 10px 25px -5px ${themeColors.primary}33`;
	} else if (customBgColor) {
		style.backgroundColor = customBgColor;
		if (customTextColor) style.color = customTextColor;
	} else if (isOutlined && themeColors) {
		style.border = `2px solid ${themeColors.border}`;
		style.color = themeColors.cardFg;
		style.backgroundColor = "transparent";
	}

	if (!isHighlighted && !customBgColor && !isOutlined) {
		style.backgroundColor =
			colorMode === "dark" ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.7)";
		style.borderColor = colorMode === "dark" ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.6)";
		style.color = colorMode === "dark" ? "#ffffff" : "#0f172a";
	}

	const glassClasses =
		!isHighlighted && !customBgColor && !isOutlined
			? "hover:brightness-110 backdrop-blur-2xl border shadow-lg shadow-black/5"
			: "";

	const colorClasses = isHighlighted || customBgColor || isOutlined ? "" : glassClasses;

	return (
		<div role="listitem" className="ld-link-block">
			<a
				href={block.url || "#"}
				target={openInNewTab ? "_blank" : "_self"}
				rel={openInNewTab ? "noopener noreferrer" : undefined}
				onClick={handleClick}
				className={`${baseClasses} ${colorClasses} focus-visible:outline-2 focus-visible:outline-offset-2`}
				style={{ ...style, outlineColor: themeColors?.primary || "#3b82f6" }}
			>
				{hasRichContent ? (
					<span className="flex items-center gap-2">
						{emoji && emojiPosition === "left" && (
							<span className="shrink-0" aria-hidden="true">
								{emoji}
							</span>
						)}
						<span className="flex-1 min-w-0">
							<span className="block">{block.title || "Untitled Link"}</span>
							{description && (
								<span
									className="block text-xs font-normal opacity-70 truncate mt-0.5"
									title={description}
								>
									{description}
								</span>
							)}
						</span>
						{emoji && emojiPosition === "right" && (
							<span className="shrink-0" aria-hidden="true">
								{emoji}
							</span>
						)}
						{thumbnail && (
							<img src={thumbnail} alt="" className="h-12 w-12 shrink-0 rounded-md object-cover" />
						)}
					</span>
				) : (
					<span className="inline-flex items-center gap-2 pr-12 overflow-hidden">
						{emoji && emojiPosition === "left" && (
							<span className="shrink-0" aria-hidden="true">
								{emoji}
							</span>
						)}
						<span className="truncate">{block.title || "Untitled Link"}</span>
						{emoji && emojiPosition === "right" && (
							<span className="shrink-0" aria-hidden="true">
								{emoji}
							</span>
						)}
						<ArrowRight
							className="absolute right-4 h-4 w-4 shrink-0 opacity-30 group-hover:opacity-70 group-hover:translate-x-0.5 transition-all duration-300"
							aria-hidden="true"
						/>
					</span>
				)}
			</a>
		</div>
	);
}

"use client";

import { useMutation } from "@tanstack/react-query";
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
	const borderRadius = (config.borderRadius as string) || "lg";
	const shadow = config.shadow as string | undefined;
	const customBgColor = config.customBgColor as string | undefined;
	const customTextColor = config.customTextColor as string | undefined;

	const radiusClasses: Record<string, string> = {
		none: "rounded-none",
		sm: "rounded-sm",
		md: "rounded-md",
		lg: "rounded-lg",
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

	const baseClasses = `block w-full px-6 py-3.5 font-medium transition-all duration-200 ${
		radiusClasses[borderRadius] || "rounded-lg"
	} ${shadowClasses[shadow || "none"]} ${
		textAlignClasses[textAlign] || "text-center"
	} ${animation && animationClasses[animation] ? animationClasses[animation] : ""}`;

	const style: React.CSSProperties = {
		transition: "background-color 0.5s ease, color 0.5s ease, border-color 0.5s ease",
	};

	if (customBgColor) {
		style.backgroundColor = customBgColor;
		if (customTextColor) style.color = customTextColor;
	} else if (themeColors) {
		if (isOutlined) {
			style.border = `2px solid ${themeColors.border}`;
			style.color = themeColors.cardFg;
			style.backgroundColor = "transparent";
		} else {
			style.backgroundColor = themeColors.card;
			style.color = themeColors.cardFg;
		}
	}

	const colorClasses = customBgColor || themeColors
		? ""
		: isOutlined
			? colorMode === "dark"
				? "border-2 border-gray-600 text-white hover:bg-gray-800"
				: "border-2 border-gray-300 text-gray-900 hover:bg-gray-50"
			: colorMode === "dark"
				? "bg-gray-800 text-white hover:bg-gray-700"
				: "bg-white text-gray-900 shadow-sm hover:shadow-md";

	return (
		<div role="listitem" className="ld-link-block">
			<a
				href={block.url || "#"}
				target={openInNewTab ? "_blank" : "_self"}
				rel={openInNewTab ? "noopener noreferrer" : undefined}
				onClick={handleClick}
				className={`${baseClasses} ${colorClasses} hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-2`}
				style={{ ...style, outlineColor: themeColors?.primary || "#3b82f6" }}
			>
				<span className="flex items-center justify-center gap-2">
					{emoji && emojiPosition === "left" && (
						<span aria-hidden="true">{emoji}</span>
					)}
					<span>{block.title || "Untitled Link"}</span>
					{emoji && emojiPosition === "right" && (
						<span aria-hidden="true">{emoji}</span>
					)}
				</span>
			</a>
		</div>
	);
}

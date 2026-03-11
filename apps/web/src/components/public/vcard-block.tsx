"use client";

import type { ThemeColors } from "./public-page";
import { getContrastColor } from "./contact-form-modal";

interface VCardBlockProps {
	block: {
		id: string;
		title: string | null;
	};
	config: Record<string, unknown>;
	colorMode: "light" | "dark";
	themeColors?: ThemeColors;
}

const animationClasses: Record<string, string> = {
	pulse: "hover:animate-pulse",
	shake: "hover:animate-[shake_0.3s]",
};

export function VCardBlock({
	block,
	config,
	colorMode,
	themeColors,
}: VCardBlockProps) {
	const buttonText = (config.buttonText as string) || block.title || "Download Contact";
	const buttonEmoji = config.buttonEmoji as string | undefined;
	const buttonEmojiPosition = (config.buttonEmojiPosition as string) || "left";
	const isOutlined = config.isOutlined as boolean | undefined;
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

	const baseClasses = `block w-full px-6 py-3.5 font-medium text-center transition-all duration-200 ${
		radiusClasses[borderRadius] || "rounded-lg"
	} ${shadowClasses[shadow || "none"]} ${
		animation && animationClasses[animation] ? animationClasses[animation] : ""
	}`;

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
			style.backgroundColor = themeColors.primary;
			style.color = getContrastColor(themeColors.primary);
		}
	}

	const colorClasses =
		customBgColor || themeColors
			? ""
			: isOutlined
				? colorMode === "dark"
					? "border-2 border-gray-600 text-white hover:bg-gray-800"
					: "border-2 border-gray-300 text-gray-900 hover:bg-gray-50"
				: colorMode === "dark"
					? "bg-gray-800 text-white hover:bg-gray-700"
					: "bg-white text-gray-900 border border-gray-200 shadow-sm hover:shadow-md";

	return (
		<div role="listitem" className="ld-vcard-block">
			<a
				href="/api/vcard"
				download="contact.vcf"
				className={`${baseClasses} ${colorClasses} cursor-pointer hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-2 no-underline`}
				style={{ ...style, outlineColor: themeColors?.primary || "#3b82f6" }}
			>
				<span className="flex items-center justify-center gap-2">
					{buttonEmoji && buttonEmojiPosition === "left" && (
						<span aria-hidden="true">{buttonEmoji}</span>
					)}
					<span>{buttonText}</span>
					{buttonEmoji && buttonEmojiPosition === "right" && (
						<span aria-hidden="true">{buttonEmoji}</span>
					)}
				</span>
			</a>
		</div>
	);
}

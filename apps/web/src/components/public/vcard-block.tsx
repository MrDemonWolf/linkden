"use client";

import { getReadableTextColor } from "@linkden/ui/color-contrast";
import { trackClick } from "@/lib/track";
import { usePreview } from "./preview-context";
import type { ThemeColors } from "./public-page";

interface VCardBlockProps {
	block: {
		id: string;
		title: string | null;
	};
	config: Record<string, unknown>;
	colorMode: "light" | "dark";
	themeColors?: ThemeColors;
}

const apiBase = process.env.NEXT_PUBLIC_SERVER_URL ?? "";

export function VCardBlock({ block, config, colorMode, themeColors }: VCardBlockProps) {
	const { isPreview } = usePreview();
	const buttonText = (config.buttonText as string) || block.title || "Download Contact";
	const buttonEmoji = config.buttonEmoji as string | undefined;
	const buttonEmojiPosition = (config.buttonEmojiPosition as string) || "left";
	const isOutlined = config.isOutlined as boolean | undefined;
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

	const baseClasses = `flex min-h-11 w-full items-center justify-center px-6 py-3 text-body font-medium transition-all duration-200 ${
		radiusClasses[borderRadius] || "rounded-lg"
	} ${shadowClasses[shadow || "none"]}`;

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
			style.color = getReadableTextColor(themeColors.primary);
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
		<a
			href={isPreview ? undefined : `${apiBase}/api/vcard`}
			download={isPreview ? undefined : "contact.vcf"}
			onClick={(e: React.MouseEvent) => {
				if (isPreview) e.preventDefault();
				trackClick(block.id, { preview: isPreview });
			}}
			className={`ld-vcard-block ${baseClasses} ${colorClasses} cursor-pointer hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-2 no-underline`}
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
	);
}

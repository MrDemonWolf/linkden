"use client";

import { useState } from "react";
import type { ThemeColors } from "./public-page";
import { usePreview } from "./preview-context";
import { ContactFormModal } from "./contact-form-modal";

interface ContactFormBlockProps {
	block: {
		id: string;
		title: string | null;
	};
	config: Record<string, unknown>;
	colorMode: "light" | "dark";
	captchaProvider: string;
	captchaSiteKey: string | null;
	themeColors?: ThemeColors;
}

const animationClasses: Record<string, string> = {
	fade: "animate-[fadeIn_0.5s_ease-in-out]",
	slide: "animate-[slideIn_0.3s_ease-out]",
	bounce: "hover:animate-[bounce_0.3s]",
	pulse: "hover:animate-pulse",
};

export function ContactFormBlock({
	block,
	config,
	colorMode,
	themeColors,
}: ContactFormBlockProps) {
	const { isPreview } = usePreview();
	const [modalOpen, setModalOpen] = useState(false);

	const buttonText = (config.buttonText as string) || "Contact Me";
	const buttonEmoji = config.buttonEmoji as string | undefined;
	const buttonEmojiPosition = (config.buttonEmojiPosition as string) || "left";
	const textAlign = (config.textAlign as string) || "center";
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

	const colorClasses =
		customBgColor || themeColors
			? ""
			: isOutlined
				? colorMode === "dark"
					? "border-2 border-gray-600 text-white hover:bg-gray-800"
					: "border-2 border-gray-300 text-gray-900 hover:bg-gray-50"
				: colorMode === "dark"
					? "bg-gray-800 text-white hover:bg-gray-700"
					: "bg-white text-gray-900 shadow-sm hover:shadow-md";

	return (
		<div role="listitem" className="ld-contact-block">
			<button
				type="button"
				onClick={() => setModalOpen(true)}
				className={`${baseClasses} ${colorClasses} cursor-pointer hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-2`}
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
			</button>

			{modalOpen && (
				<ContactFormModal
					blockId={block.id}
					blockTitle={block.title}
					config={config}
					colorMode={colorMode}
					themeColors={themeColors}
					isPreview={isPreview}
					onClose={() => setModalOpen(false)}
				/>
			)}
		</div>
	);
}

"use client";

import { getReadableTextColor } from "@linkden/ui/color-contrast";
import { useState } from "react";
import { initials } from "@/lib/format";
import { getGravatarUrl } from "@/lib/gravatar";

interface AvatarProps {
	src: string | null;
	name: string;
	email?: string;
	size?: "sm" | "md" | "lg";
	className?: string;
	hasBanner?: boolean;
	ringColor?: string;
	colorMode?: "light" | "dark";
	themeColors?: { primary: string; accent: string; bg?: string };
}

const sizeClasses = {
	sm: "h-12 w-12 text-lg",
	md: "h-16 w-16 text-xl",
	lg: "h-24 w-24 text-3xl",
};

export function Avatar({
	src,
	name,
	email,
	size = "md",
	className,
	hasBanner,
	ringColor,
	colorMode = "dark",
	themeColors,
}: AvatarProps) {
	const [imgError, setImgError] = useState(false);

	const fallbackInitials = initials(name);

	const ringStyle: React.CSSProperties =
		hasBanner && ringColor
			? {
					boxShadow: `0 0 0 4px ${ringColor}`,
					transition: "box-shadow 0.5s ease",
					filter: "drop-shadow(0 4px 12px rgba(0,0,0,0.3))",
				}
			: {};

	// The 2px ring offset must match the resolved page background, not the global
	// .dark token — otherwise a light-preset page shows a navy gap around the avatar.
	const ringOffsetStyle: React.CSSProperties =
		!hasBanner && themeColors?.bg
			? ({ "--tw-ring-offset-color": themeColors.bg } as React.CSSProperties)
			: {};

	// White ring vanishes on light backgrounds — pick ring tint by resolved mode
	const ringClasses = hasBanner
		? ""
		: `ring-2 ring-offset-2 ${colorMode === "dark" ? "ring-white/30" : "ring-black/15"}`;

	const fallbackDiv = (
		<div
			className={`${sizeClasses[size]} flex items-center justify-center rounded-full font-bold shadow-xl ${ringClasses} ${className ?? ""}`}
			style={{
				...(themeColors
					? {
							background: `linear-gradient(135deg, ${themeColors.primary}, ${themeColors.accent})`,
							color: getReadableTextColor(themeColors.primary),
						}
					: { background: "linear-gradient(135deg, #0FACED, #38BDF8)", color: "#FFFFFF" }),
				...ringOffsetStyle,
				...ringStyle,
				transition: `background 0.5s ease, color 0.5s ease${ringStyle.transition ? `, ${ringStyle.transition}` : ", box-shadow 0.5s ease"}`,
			}}
			role="img"
			aria-label={name}
		>
			{fallbackInitials}
		</div>
	);

	// Resolve the image URL: src takes priority, then Gravatar, then initials
	const imageSrc = src ?? (email ? getGravatarUrl(email) : null);

	return (
		<div className="ld-avatar flex justify-center">
			{imageSrc && !imgError ? (
				<img
					src={imageSrc}
					alt={name}
					className={`${sizeClasses[size]} rounded-full object-cover shadow-xl ${ringClasses} ${className ?? ""}`}
					style={{ ...ringOffsetStyle, ...ringStyle }}
					onError={() => setImgError(true)}
				/>
			) : (
				fallbackDiv
			)}
		</div>
	);
}

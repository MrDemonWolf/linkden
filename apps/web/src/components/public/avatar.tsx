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

	// Soft tinted fallback (mirrors admin icon tiles: low-alpha primary bg +
	// primary text) instead of a saturated gradient disc. Hex-alpha concat only
	// works on #RRGGBB values; anything else falls back to the solid primary.
	const primaryIsHex6 = themeColors ? /^#[0-9a-fA-F]{6}$/.test(themeColors.primary) : false;

	// Single subtle ring — the shared offset double ring reads too heavy on a
	// tinted disc. (The banner boxShadow ring still applies via ringStyle.)
	const fallbackRingClasses = hasBanner
		? ""
		: `ring-1 ${colorMode === "dark" ? "ring-white/15" : "ring-black/10"}`;

	const fallbackDiv = (
		<div
			className={`${sizeClasses[size]} flex items-center justify-center rounded-full font-bold shadow-xl ${fallbackRingClasses} ${className ?? ""}`}
			style={{
				...(themeColors && primaryIsHex6
					? {
							// Opaque tint: page bg under a 15% primary wash, so a banner
							// can't bleed through a translucent disc.
							backgroundColor: themeColors.bg ?? (colorMode === "dark" ? "#141416" : "#FFFFFF"),
							backgroundImage: `linear-gradient(0deg, ${themeColors.primary}26, ${themeColors.primary}26)`,
							color: themeColors.primary,
						}
					: themeColors
						? {
								backgroundColor: themeColors.primary,
								color: getReadableTextColor(themeColors.primary),
							}
						: { backgroundColor: "#0FACED26", color: "#0FACED" }),
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

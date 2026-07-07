"use client";

import { useState } from "react";
import { getGravatarUrl } from "@/lib/gravatar";

function getContrastColor(hex: string): string {
	const r = parseInt(hex.slice(1, 3), 16) / 255;
	const g = parseInt(hex.slice(3, 5), 16) / 255;
	const b = parseInt(hex.slice(5, 7), 16) / 255;
	const toLinear = (c: number) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
	const L = 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
	return L > 0.179 ? "#000000" : "#FFFFFF";
}

interface AvatarProps {
	src: string | null;
	name: string;
	email?: string;
	size?: "sm" | "md" | "lg";
	className?: string;
	hasBanner?: boolean;
	ringColor?: string;
	themeColors?: { primary: string; accent: string };
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
	themeColors,
}: AvatarProps) {
	const [imgError, setImgError] = useState(false);

	const initials = name
		.split(" ")
		.map((n) => n[0])
		.join("")
		.toUpperCase()
		.slice(0, 2);

	const ringStyle: React.CSSProperties =
		hasBanner && ringColor
			? {
					boxShadow: `0 0 0 4px ${ringColor}`,
					transition: "box-shadow 0.5s ease",
					filter: "drop-shadow(0 4px 12px rgba(0,0,0,0.3))",
				}
			: {};

	const fallbackDiv = (
		<div
			className={`${sizeClasses[size]} flex items-center justify-center rounded-full font-bold shadow-xl ${hasBanner ? "" : "ring-2 ring-white/30 ring-offset-2 ring-offset-background"} ${className ?? ""}`}
			style={{
				...(themeColors
					? {
							background: `linear-gradient(135deg, ${themeColors.primary}, ${themeColors.accent})`,
							color: getContrastColor(themeColors.primary),
						}
					: { background: "linear-gradient(135deg, #0FACED, #38BDF8)", color: "#FFFFFF" }),
				...ringStyle,
				transition: `background 0.5s ease, color 0.5s ease${ringStyle.transition ? `, ${ringStyle.transition}` : ", box-shadow 0.5s ease"}`,
			}}
			role="img"
			aria-label={name}
		>
			{initials}
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
					className={`${sizeClasses[size]} rounded-full object-cover shadow-xl ${hasBanner ? "" : "ring-2 ring-white/30 ring-offset-2 ring-offset-background"} ${className ?? ""}`}
					style={ringStyle}
					onError={() => setImgError(true)}
				/>
			) : (
				fallbackDiv
			)}
		</div>
	);
}

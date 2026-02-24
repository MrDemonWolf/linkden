"use client";

import { useEffect, useRef } from "react";
import { getPresetById } from "@linkden/ui/banner-presets";
import { usePreview } from "./preview-context";

interface BannerSectionProps {
	bannerPreset: string;
	colorMode: "light" | "dark";
	bgColor: string;
	themeColors?: { primary: string; accent: string; bg: string };
}

export function BannerSection({
	bannerPreset,
	colorMode,
	bgColor,
	themeColors,
}: BannerSectionProps) {
	const { isPreview } = usePreview();
	const bannerRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		if (isPreview) return;
		const handleScroll = () => {
			if (!bannerRef.current) return;
			const scrollY = window.scrollY;
			bannerRef.current.style.transform = `translateY(${scrollY * 0.4}px)`;
		};

		window.addEventListener("scroll", handleScroll, { passive: true });
		return () => window.removeEventListener("scroll", handleScroll);
	}, [isPreview]);

	const preset = getPresetById(bannerPreset, themeColors);
	if (!preset) return null;

	return (
		<div className="relative h-36 w-full overflow-hidden md:h-48">
			<div
				ref={bannerRef}
				className={`absolute inset-0 ${preset.className ?? ""}`}
				style={{ ...preset.style, willChange: "transform" }}
			/>
			{/* Subtle full-height fade for extra smoothness */}
			<div
				className="absolute inset-0"
				style={{
					background: `linear-gradient(to top, ${bgColor}0d, transparent)`,
				}}
			/>
			{/* Bottom gradient fade — taller for seamless blend */}
			<div
				className="absolute inset-x-0 bottom-0 h-24"
				style={{
					background: `linear-gradient(to top, ${bgColor}, transparent)`,
					transition: "background 0.5s ease",
				}}
			/>
		</div>
	);
}

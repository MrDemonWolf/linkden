"use client";

import { useEffect, useRef } from "react";
import { getPresetById } from "@linkden/ui/banner-presets";
import { usePreview } from "./preview-context";
import { ShaderBanner } from "./shader-banner";

interface BannerSectionProps {
	bannerPreset: string;
	colorMode: "light" | "dark";
	bgColor: string;
	themeColors?: { primary: string; accent: string; bg: string };
	bannerMode?: "preset" | "custom";
	bannerCustomUrl?: string;
}

export function BannerSection({
	bannerPreset,
	colorMode,
	bgColor,
	themeColors,
	bannerMode = "preset",
	bannerCustomUrl,
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

	// Custom image banner mode
	if (bannerMode === "custom" && bannerCustomUrl) {
		return (
			<div className="relative h-36 w-full overflow-hidden md:h-48 -mb-px">
				<div
					ref={bannerRef}
					className="absolute inset-0"
					style={{ willChange: "transform" }}
				>
					<img
						src={bannerCustomUrl}
						alt=""
						className="h-full w-full object-cover"
					/>
				</div>
				{/* Gradient fade overlay */}
				<div
					className="absolute inset-0"
					style={{
						background: `linear-gradient(to top, ${bgColor} 0%, ${bgColor}99 20%, transparent 60%)`,
						transition: "background 0.5s ease",
					}}
				/>
			</div>
		);
	}

	// Preset gradient banner mode
	const preset = getPresetById(bannerPreset, themeColors);
	if (!preset) return null;

	return (
		<div className="relative h-36 w-full overflow-hidden md:h-48 -mb-px">
			<div
				ref={bannerRef}
				className={`absolute inset-0 ${preset.type === "css" ? (preset.className ?? "") : ""}`}
				style={preset.type === "css" ? { ...preset.style, willChange: "transform" } : { willChange: "transform" }}
			>
				{preset.type === "shader" && <ShaderBanner preset={preset} />}
			</div>
			{/* Single full-height gradient fade for seamless blend */}
			<div
				className="absolute inset-0"
				style={{
					background: `linear-gradient(to top, ${bgColor} 0%, ${bgColor}99 20%, transparent 60%)`,
					transition: "background 0.5s ease",
				}}
			/>
		</div>
	);
}

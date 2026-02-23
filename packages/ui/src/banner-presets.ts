import type { CSSProperties } from "react";

export interface BannerPreset {
	id: string;
	name: string;
	category: "gradient" | "animated" | "pattern" | "solid";
	style: CSSProperties;
	className?: string;
}

// Universal presets (theme-independent)
const universalPresets: BannerPreset[] = [
	{
		id: "midnight",
		name: "Midnight",
		category: "gradient",
		style: {
			background:
				"linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%)",
		},
	},
	{
		id: "carbon-fiber",
		name: "Carbon Fiber",
		category: "pattern",
		style: {
			backgroundColor: "#1a1a2e",
			backgroundImage: `radial-gradient(circle at 1px 1px, rgba(255,255,255,0.05) 1px, transparent 0)`,
			backgroundSize: "16px 16px",
		},
	},
	{
		id: "grain-dark",
		name: "Grain Dark",
		category: "solid",
		style: {
			backgroundColor: "#18181b",
		},
		className: "banner-grain-overlay",
	},
	{
		id: "cyber-drift",
		name: "Cyber Drift",
		category: "animated",
		style: {
			backgroundImage:
				"linear-gradient(135deg, #00f5d4 0%, #7b2ff7 25%, #f72585 50%, #00f5d4 75%, #7b2ff7 100%)",
			backgroundSize: "200% 200%",
		},
		className: "animate-gradient-drift",
	},
];

/**
 * Generate banner presets derived from the active theme's colors,
 * plus universal (theme-independent) presets.
 */
export function getBannerPresetsForTheme(
	primary: string,
	accent: string,
	bg: string,
): BannerPreset[] {
	const themeDerived: BannerPreset[] = [
		{
			id: "theme-gradient",
			name: "Theme Gradient",
			category: "gradient",
			style: {
				backgroundImage: `linear-gradient(135deg, ${primary}, ${accent})`,
			},
		},
		{
			id: "theme-mesh",
			name: "Theme Mesh",
			category: "gradient",
			style: {
				backgroundImage: `linear-gradient(135deg, ${primary} 0%, ${accent} 50%, ${primary} 100%)`,
			},
		},
		{
			id: "theme-drift",
			name: "Theme Drift",
			category: "animated",
			style: {
				backgroundImage: `linear-gradient(135deg, ${primary} 0%, ${accent} 25%, ${primary} 50%, ${accent} 75%, ${primary} 100%)`,
				backgroundSize: "200% 200%",
			},
			className: "animate-gradient-drift",
		},
		{
			id: "theme-radial",
			name: "Theme Radial",
			category: "gradient",
			style: {
				background: `radial-gradient(ellipse at 50% 0%, ${accent} 0%, ${bg} 70%)`,
			},
		},
		{
			id: "theme-fade",
			name: "Theme Fade",
			category: "gradient",
			style: {
				background: `linear-gradient(180deg, ${primary}1a 0%, ${bg} 100%)`,
			},
		},
	];

	return [...themeDerived, ...universalPresets];
}

/**
 * Get all presets (backwards-compatible).
 * Uses default theme colors when no theme colors are provided.
 */
export const bannerPresets: BannerPreset[] = getBannerPresetsForTheme(
	"#0FACED",
	"#38BDF8",
	"#091533",
);

/**
 * Look up a preset by ID. For theme-derived IDs, pass theme colors
 * so the preset uses the correct colors.
 */
export function getPresetById(
	id: string,
	themeColors?: { primary: string; accent: string; bg: string },
): BannerPreset | undefined {
	if (themeColors && id.startsWith("theme-")) {
		const presets = getBannerPresetsForTheme(
			themeColors.primary,
			themeColors.accent,
			themeColors.bg,
		);
		return presets.find((p) => p.id === id);
	}

	// For universal presets or when no theme colors provided
	return bannerPresets.find((p) => p.id === id);
}

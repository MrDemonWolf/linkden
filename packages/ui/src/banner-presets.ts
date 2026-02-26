import type { CSSProperties } from "react";

interface BannerPresetBase {
	id: string;
	name: string;
	category: "gradient" | "shader" | "pattern" | "solid";
}

export interface CssBannerPreset extends BannerPresetBase {
	type: "css";
	style: CSSProperties;
	className?: string;
}

export interface ShaderBannerPreset extends BannerPresetBase {
	type: "shader";
	shaderType:
		| "mesh-gradient"
		| "neuro-noise"
		| "waves"
		| "grain-gradient"
		| "swirl";
	shaderProps: Record<string, unknown>;
}

export type BannerPreset = CssBannerPreset | ShaderBannerPreset;

// Universal presets (theme-independent)
const universalPresets: CssBannerPreset[] = [
	{
		id: "midnight",
		name: "Midnight",
		type: "css",
		category: "gradient",
		style: {
			background:
				"linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%)",
		},
	},
	{
		id: "carbon-fiber",
		name: "Carbon Fiber",
		type: "css",
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
		type: "css",
		category: "solid",
		style: {
			backgroundColor: "#18181b",
		},
		className: "banner-grain-overlay",
	},
	{
		id: "ember-glow",
		name: "Ember Glow",
		type: "css",
		category: "gradient",
		style: {
			background:
				"radial-gradient(ellipse at 30% 80%, #B91C1C33 0%, transparent 50%), radial-gradient(ellipse at 70% 90%, #EA580C44 0%, transparent 50%), linear-gradient(180deg, #1a1a1a 0%, #2d1b0e 100%)",
		},
	},
	{
		id: "wolf-shadow",
		name: "Wolf Shadow",
		type: "css",
		category: "gradient",
		style: {
			background:
				"linear-gradient(160deg, #0f172a 0%, #1e293b 40%, #1e3a5f 70%, #0f172a 100%), radial-gradient(ellipse at 60% 20%, #38BDF822 0%, transparent 60%)",
			backgroundBlendMode: "screen" as const,
		},
	},
	{
		id: "void-rift",
		name: "Void Rift",
		type: "css",
		category: "gradient",
		style: {
			background:
				"radial-gradient(ellipse at 50% 50%, #7C3AED22 0%, transparent 40%), linear-gradient(180deg, #08040F 0%, #130A1F 50%, #08040F 100%)",
		},
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
	const themeDerivedCss: CssBannerPreset[] = [
		{
			id: "theme-gradient",
			name: "Theme Gradient",
			type: "css",
			category: "gradient",
			style: {
				backgroundImage: `linear-gradient(135deg, ${primary}, ${accent})`,
			},
		},
		{
			id: "theme-mesh",
			name: "Theme Mesh",
			type: "css",
			category: "gradient",
			style: {
				backgroundImage: `linear-gradient(135deg, ${primary} 0%, ${accent} 50%, ${primary} 100%)`,
			},
		},
		{
			id: "theme-radial",
			name: "Theme Radial",
			type: "css",
			category: "gradient",
			style: {
				background: `radial-gradient(ellipse at 50% 0%, ${accent} 0%, ${bg} 70%)`,
			},
		},
		{
			id: "theme-fade",
			name: "Theme Fade",
			type: "css",
			category: "gradient",
			style: {
				background: `linear-gradient(180deg, ${primary}1a 0%, ${bg} 100%)`,
			},
		},
	];

	const shaderPresets: ShaderBannerPreset[] = [
		{
			id: "shader-mesh-gradient",
			name: "Mesh Gradient",
			type: "shader",
			category: "shader",
			shaderType: "mesh-gradient",
			shaderProps: {
				colors: [primary, accent, bg, primary],
				speed: 0.4,
			},
		},
		{
			id: "shader-neuro-noise",
			name: "Neuro Noise",
			type: "shader",
			category: "shader",
			shaderType: "neuro-noise",
			shaderProps: {
				colorFront: accent,
				colorMid: primary,
				colorBack: bg,
				speed: 0.5,
			},
		},
		{
			id: "shader-waves",
			name: "Waves",
			type: "shader",
			category: "shader",
			shaderType: "waves",
			shaderProps: {
				colorFront: primary,
				colorBack: bg,
			},
		},
		{
			id: "shader-grain-gradient",
			name: "Grain Gradient",
			type: "shader",
			category: "shader",
			shaderType: "grain-gradient",
			shaderProps: {
				colors: [primary, accent, bg],
				colorBack: bg,
				speed: 0.3,
			},
		},
		{
			id: "shader-swirl",
			name: "Swirl",
			type: "shader",
			category: "shader",
			shaderType: "swirl",
			shaderProps: {
				colors: [primary, accent],
				colorBack: bg,
				speed: 0.3,
			},
		},
	];

	return [...themeDerivedCss, ...universalPresets, ...shaderPresets];
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

/** Legacy preset IDs that map to new shader equivalents */
const LEGACY_MAP: Record<string, string> = {
	"theme-drift": "shader-mesh-gradient",
	"cyber-drift": "shader-swirl",
};

/**
 * Look up a preset by ID. For theme-derived IDs, pass theme colors
 * so the preset uses the correct colors.
 */
export function getPresetById(
	id: string,
	themeColors?: { primary: string; accent: string; bg: string },
): BannerPreset | undefined {
	// Remap legacy animated preset IDs to shader equivalents
	const resolvedId = LEGACY_MAP[id] ?? id;

	if (themeColors && (resolvedId.startsWith("theme-") || resolvedId.startsWith("shader-"))) {
		const presets = getBannerPresetsForTheme(
			themeColors.primary,
			themeColors.accent,
			themeColors.bg,
		);
		return presets.find((p) => p.id === resolvedId);
	}

	// For universal presets or when no theme colors provided
	return bannerPresets.find((p) => p.id === resolvedId);
}

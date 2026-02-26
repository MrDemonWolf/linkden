"use client";

import { lazy, Suspense } from "react";
import type { ShaderBannerPreset } from "@linkden/ui/banner-presets";

const MeshGradient = lazy(() =>
	import("@paper-design/shaders-react").then((m) => ({ default: m.MeshGradient })),
);
const NeuroNoise = lazy(() =>
	import("@paper-design/shaders-react").then((m) => ({ default: m.NeuroNoise })),
);
const Waves = lazy(() =>
	import("@paper-design/shaders-react").then((m) => ({ default: m.Waves })),
);
const GrainGradient = lazy(() =>
	import("@paper-design/shaders-react").then((m) => ({ default: m.GrainGradient })),
);
const Swirl = lazy(() =>
	import("@paper-design/shaders-react").then((m) => ({ default: m.Swirl })),
);

const shaderMap = {
	"mesh-gradient": MeshGradient,
	"neuro-noise": NeuroNoise,
	waves: Waves,
	"grain-gradient": GrainGradient,
	swirl: Swirl,
} as const;

interface ShaderBannerProps {
	preset: ShaderBannerPreset;
	staticPreview?: boolean;
}

export function ShaderBanner({ preset, staticPreview }: ShaderBannerProps) {
	const Component = shaderMap[preset.shaderType];
	if (!Component) return null;

	const freezeProps = staticPreview ? { speed: 0, frame: 0 } : {};
	const fallbackColor =
		(preset.shaderProps.colorBack as string) ??
		(preset.shaderProps.colorMid as string) ??
		"#000";

	return (
		<Suspense
			fallback={
				<div
					className="absolute inset-0"
					style={{ backgroundColor: fallbackColor }}
				/>
			}
		>
			<Component
				{...preset.shaderProps}
				{...freezeProps}
				style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
			/>
		</Suspense>
	);
}

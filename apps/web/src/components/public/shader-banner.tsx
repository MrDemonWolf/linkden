"use client";

import type { ShaderBannerPreset } from "@linkden/ui/banner-presets";
import { Pause, Play } from "lucide-react";
import { lazy, Suspense, useState } from "react";
import { useMediaQuery } from "@/hooks/use-media-query";

const MeshGradient = lazy(() =>
	import("@paper-design/shaders-react").then((m) => ({ default: m.MeshGradient })),
);
const NeuroNoise = lazy(() =>
	import("@paper-design/shaders-react").then((m) => ({ default: m.NeuroNoise })),
);
const Waves = lazy(() => import("@paper-design/shaders-react").then((m) => ({ default: m.Waves })));
const GrainGradient = lazy(() =>
	import("@paper-design/shaders-react").then((m) => ({ default: m.GrainGradient })),
);
const Swirl = lazy(() => import("@paper-design/shaders-react").then((m) => ({ default: m.Swirl })));

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
	/**
	 * Render a small pause/play button (WCAG 2.2.2: motion that runs longer
	 * than 5s beside content needs a way to stop it, OS setting or not).
	 */
	showPauseControl?: boolean;
}

export function ShaderBanner({ preset, staticPreview, showPauseControl }: ShaderBannerProps) {
	// The shaders animate on requestAnimationFrame, which the global
	// reduced-motion CSS rule can't reach — freeze them explicitly.
	const reducedMotion = useMediaQuery("(prefers-reduced-motion: reduce)");
	const [paused, setPaused] = useState(false);
	const Component = shaderMap[preset.shaderType];
	if (!Component) return null;

	const frozen = staticPreview || reducedMotion;
	const motionProps = frozen ? { speed: 0, frame: 0 } : paused ? { speed: 0 } : {};
	const fallbackColor =
		(preset.shaderProps.colorBack as string) ?? (preset.shaderProps.colorMid as string) ?? "#000";

	return (
		<>
			<Suspense
				fallback={<div className="absolute inset-0" style={{ backgroundColor: fallbackColor }} />}
			>
				<Component
					{...preset.shaderProps}
					{...motionProps}
					style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
				/>
			</Suspense>
			{showPauseControl && !frozen && (
				<button
					type="button"
					onClick={() => setPaused((p) => !p)}
					aria-label={paused ? "Play banner animation" : "Pause banner animation"}
					className="absolute bottom-2 right-2 z-10 inline-flex h-8 w-8 items-center justify-center rounded-full text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
					style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
				>
					{paused ? (
						<Play className="h-3.5 w-3.5" aria-hidden="true" />
					) : (
						<Pause className="h-3.5 w-3.5" aria-hidden="true" />
					)}
				</button>
			)}
		</>
	);
}

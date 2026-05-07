import type { CSSProperties } from "react";
import { bannerPresets, type BannerPreset, type ShaderBannerPreset } from "@linkden/ui";

export interface LoginBranding {
	loginBgMode?: "default" | "preset" | "custom" | null;
	loginBgPreset?: string | null;
	loginBgCustomUrl?: string | null;
}

// Curated subset shown in branding settings — past customs + a few shader options.
export const LOGIN_BG_PRESET_IDS = [
	"wolf-shadow",
	"void-rift",
	"midnight",
	"ember-glow",
	"carbon-fiber",
	"shader-mesh-gradient",
	"shader-neuro-noise",
	"shader-waves",
] as const;

export function getLoginBgPresets(): BannerPreset[] {
	return bannerPresets.filter((p) =>
		(LOGIN_BG_PRESET_IDS as readonly string[]).includes(p.id),
	);
}

export function findLoginBgPreset(id: string | null | undefined): BannerPreset | null {
	if (!id) return null;
	return bannerPresets.find((p) => p.id === id) ?? null;
}

/**
 * Wrapper-level inline style for login/setup background.
 * Returns undefined when default — caller relies on `.login-bg` CSS class instead.
 */
export function getLoginBgStyle(branding: LoginBranding | null | undefined): CSSProperties | undefined {
	if (!branding) return undefined;
	const mode = branding.loginBgMode ?? "default";

	if (mode === "custom" && branding.loginBgCustomUrl) {
		return {
			backgroundImage: `url(${branding.loginBgCustomUrl})`,
			backgroundSize: "cover",
			backgroundPosition: "center",
			backgroundRepeat: "no-repeat",
		};
	}

	if (mode === "preset") {
		const preset = findLoginBgPreset(branding.loginBgPreset);
		if (preset && preset.type === "css") {
			return preset.style;
		}
	}

	return undefined;
}

export function isCustomLoginBg(branding: LoginBranding | null | undefined): boolean {
	if (!branding) return false;
	if (branding.loginBgMode === "custom" && branding.loginBgCustomUrl) return true;
	if (branding.loginBgMode === "preset") {
		const preset = findLoginBgPreset(branding.loginBgPreset);
		return !!preset;
	}
	return false;
}

export function getLoginShaderPreset(branding: LoginBranding | null | undefined): ShaderBannerPreset | null {
	if (!branding || branding.loginBgMode !== "preset") return null;
	const preset = findLoginBgPreset(branding.loginBgPreset);
	if (preset && preset.type === "shader") return preset;
	return null;
}

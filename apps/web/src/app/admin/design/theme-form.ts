import type { SettingKey } from "@linkden/validators/settings";
import type { SocialIconShape } from "@/components/admin/appearance/social-icon-shape-section";

/**
 * Design → Theme form state. The four custom colours are overrides: an empty
 * field means "use the preset's colour" in whichever mode the visitor sees
 * (getThemeColors skips falsy values, public.getPage maps "" to null). The form
 * must never seed or copy concrete preset values into them — saving those would
 * pin the light palette onto dark mode as soon as anything else on the page is
 * saved.
 */
export interface ThemeForm {
	theme: string;
	colorMode: string;
	primaryColor: string;
	secondaryColor: string;
	accentColor: string;
	bgColor: string;
	customCss: string;
	verifiedBadge: boolean;
	socialIconShape: SocialIconShape;
}

export function parse(s: Record<string, string>): ThemeForm {
	return {
		theme: s.theme_preset ?? "default",
		colorMode: s.default_color_mode ?? "light",
		primaryColor: s.custom_primary ?? "",
		secondaryColor: s.custom_secondary ?? "",
		accentColor: s.custom_accent ?? "",
		bgColor: s.custom_background ?? "",
		customCss: s.custom_css ?? "",
		verifiedBadge: s.verified_badge === "true",
		socialIconShape: (s.social_icon_shape as SocialIconShape) || "circle",
	};
}

export function serialize(f: ThemeForm): Array<{ key: SettingKey; value: string }> {
	return [
		{ key: "theme_preset", value: f.theme },
		{ key: "default_color_mode", value: f.colorMode },
		{ key: "custom_primary", value: f.primaryColor },
		{ key: "custom_secondary", value: f.secondaryColor },
		{ key: "custom_accent", value: f.accentColor },
		{ key: "custom_background", value: f.bgColor },
		{ key: "custom_css", value: f.customCss },
		{ key: "verified_badge", value: String(f.verifiedBadge) },
		{ key: "social_icon_shape", value: f.socialIconShape },
	];
}

/** Picking a preset adopts its whole light + dark palette, so overrides are cleared, not replaced. */
export function clearCustomColors(prev: ThemeForm, theme: string): ThemeForm {
	return { ...prev, theme, primaryColor: "", secondaryColor: "", accentColor: "", bgColor: "" };
}

import { getContrastRatio, getReadableTextColor, hexToRgb } from "@linkden/ui/color-contrast";
import { themePresets } from "@linkden/ui/themes";

/** The public page's resolved palette for one colour mode (inline-styled, see public-page.tsx). */
export interface ThemeColors {
	primary: string;
	secondary: string;
	accent: string;
	bg: string;
	fg: string;
	card: string;
	cardFg: string;
	border: string;
	muted: string;
	mutedFg: string;
}

const AA = 4.5;

/** Linear sRGB-space mix of two #RRGGBB colours; `t` = share of `b`. Non-hex input returns `a`. */
/**
 * The page's primary colour for places that take one colour (OG card, browser
 * chrome, manifest): the custom colour when set, else the active preset's
 * light-mode primary. An empty custom colour means "inherit the preset", so a
 * fixed brand colour here would disagree with the page itself.
 */
export function pagePrimaryColor(
	settings: { customPrimary?: string | null; themePreset?: string | null } | null | undefined,
	fallback: string,
): string {
	if (settings?.customPrimary && /^#[0-9a-f]{6}$/i.test(settings.customPrimary)) {
		return settings.customPrimary;
	}
	const preset = themePresets.find((t) => t.name === settings?.themePreset);
	return preset?.cssVars.light["--ld-primary"] ?? fallback;
}

export function mixHex(a: string, b: string, t: number): string {
	const ca = hexToRgb(a);
	const cb = hexToRgb(b);
	if (!ca || !cb) return a;
	const ch = (x: number, y: number) =>
		Math.round(x + (y - x) * t)
			.toString(16)
			.padStart(2, "0");
	return `#${ch(ca.r, cb.r)}${ch(ca.g, cb.g)}${ch(ca.b, cb.b)}`;
}

const isLightSurface = (hex: string) => getReadableTextColor(hex) === "#000000";

/**
 * Secondary text that reads on every surface it is drawn on (page background,
 * cards, muted panels): the preset's own value when it already passes AA on
 * all of them, else the foreground eased toward the background as far as AA
 * allows, else the foreground itself.
 */
function readableMuted(preferred: string, fg: string, surfaces: string[]): string {
	const passes = (c: string) => surfaces.every((s) => getContrastRatio(c, s) >= AA);
	if (passes(preferred)) return preferred;
	const bg = surfaces[0] ?? fg;
	for (const t of [0.45, 0.4, 0.35, 0.3, 0.25, 0.2, 0.15, 0.1, 0.05]) {
		const candidate = mixHex(fg, bg, t);
		if (passes(candidate)) return candidate;
	}
	return fg;
}

export function getThemeColors(
	themePresetName: string,
	colorMode: "light" | "dark",
	customColors?: {
		primary?: string | null;
		secondary?: string | null;
		accent?: string | null;
		background?: string | null;
	},
): ThemeColors {
	const theme = themePresets.find((t) => t.name === themePresetName) ?? themePresets[0];
	const vars = theme.cssVars[colorMode];
	const colors: ThemeColors = {
		primary: vars["--ld-primary"],
		secondary: vars["--ld-secondary"],
		accent: vars["--ld-accent"],
		bg: vars["--ld-background"],
		fg: vars["--ld-foreground"],
		card: vars["--ld-card"],
		cardFg: vars["--ld-card-foreground"],
		border: vars["--ld-border"],
		muted: vars["--ld-muted"],
		mutedFg: vars["--ld-muted-foreground"],
	};
	// Custom overrides apply in both color modes
	if (customColors) {
		if (customColors.primary) colors.primary = customColors.primary;
		if (customColors.secondary) colors.secondary = customColors.secondary;
		if (customColors.accent) colors.accent = customColors.accent;
		if (customColors.background) {
			colors.bg = customColors.background;
			// A custom background can leave the preset's foreground unreadable
			// (e.g. a light custom bg paired with dark-mode's near-white fg) —
			// re-derive fg only when the pairing actually fails AA.
			if (getContrastRatio(colors.fg, colors.bg) < AA) {
				colors.fg = getReadableTextColor(colors.bg);
			}
			// The background applies in BOTH modes, but the preset's surfaces belong
			// to one: a white custom bg in dark mode would keep a navy hero card
			// under the re-derived black text. When the card sits on the other side
			// of the light/dark line, rebuild the surfaces from the background.
			if (isLightSurface(colors.card) !== isLightSurface(colors.bg)) {
				colors.card = mixHex(colors.bg, colors.fg, 0.04);
				colors.muted = mixHex(colors.bg, colors.fg, 0.08);
				colors.border = mixHex(colors.bg, colors.fg, 0.16);
				colors.cardFg = colors.fg;
			}
			if (getContrastRatio(colors.cardFg, colors.card) < AA) {
				colors.cardFg = getReadableTextColor(colors.card);
			}
			// mutedFg is drawn on the page background (captions, footer, location
			// text) AND on cards/muted panels (bio, form labels) — it must pass on all.
			colors.mutedFg = readableMuted(colors.mutedFg, colors.fg, [
				colors.bg,
				colors.card,
				colors.muted,
			]);
		}
	}
	return colors;
}

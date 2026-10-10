import { getContrastRatio } from "@linkden/ui/color-contrast";
import { themePresets } from "@linkden/ui/themes";
import { describe, expect, it } from "vitest";
import { getThemeColors, mixHex } from "../theme-colors";

const MODES = ["light", "dark"] as const;
// Light, dark and mid-tone custom backgrounds — each applies in BOTH modes.
const CUSTOM_BACKGROUNDS = ["#FFFFFF", "#111111", "#808080", "#0F1D3D", "#FDF6E3"];

const ratio = (a: string, b: string) => getContrastRatio(a, b);

describe("getThemeColors", () => {
	it("returns the preset palette untouched when nothing is customised", () => {
		for (const preset of themePresets) {
			for (const mode of MODES) {
				const vars = preset.cssVars[mode];
				const c = getThemeColors(preset.name, mode);
				expect(c.bg).toBe(vars["--ld-background"]);
				expect(c.card).toBe(vars["--ld-card"]);
				expect(c.mutedFg).toBe(vars["--ld-muted-foreground"]);
			}
		}
	});

	it("falls back to the first preset for an unknown name", () => {
		expect(getThemeColors("nope", "light")).toEqual(
			getThemeColors(themePresets[0]?.name ?? "", "light"),
		);
	});

	// WCAG 1.4.3: every text colour must pass AA on the surface it is drawn on,
	// whatever the custom background and colour mode.
	for (const preset of themePresets) {
		for (const mode of MODES) {
			for (const background of CUSTOM_BACKGROUNDS) {
				it(`${preset.name} / ${mode} / bg ${background} keeps text readable`, () => {
					const c = getThemeColors(preset.name, mode, { background });
					expect(c.bg).toBe(background);
					expect(ratio(c.fg, c.bg)).toBeGreaterThanOrEqual(4.5);
					expect(ratio(c.cardFg, c.card)).toBeGreaterThanOrEqual(4.5);
					expect(ratio(c.mutedFg, c.bg)).toBeGreaterThanOrEqual(4.5);
					expect(ratio(c.mutedFg, c.card)).toBeGreaterThanOrEqual(4.5);
				});
			}
		}
	}

	it("rebuilds the surfaces when a custom background crosses the light/dark line", () => {
		// Classic dark has a navy card; a white custom bg in dark mode must not
		// leave black text on that navy card (the original 1.26:1 failure).
		const c = getThemeColors(themePresets[0]?.name ?? "", "dark", { background: "#FFFFFF" });
		expect(ratio(c.cardFg, c.card)).toBeGreaterThanOrEqual(4.5);
		expect(getContrastRatio(c.card, "#FFFFFF")).toBeLessThan(1.5);
	});
});

describe("mixHex", () => {
	it("mixes two hex colours", () => {
		expect(mixHex("#000000", "#ffffff", 0)).toBe("#000000");
		expect(mixHex("#000000", "#ffffff", 1)).toBe("#ffffff");
		expect(mixHex("#000000", "#ffffff", 0.5)).toBe("#808080");
	});

	it("returns the first colour when either side isn't hex", () => {
		expect(mixHex("rgb(0,0,0)", "#ffffff", 0.5)).toBe("rgb(0,0,0)");
		expect(mixHex("#000000", "red", 0.5)).toBe("#000000");
	});
});

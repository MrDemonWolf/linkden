import { describe, expect, it } from "vitest";
import { getContrastRatio } from "../color-contrast";
import { themePresets } from "../themes";

/**
 * Locks every theme preset to WCAG AA for the pairs actually rendered as text
 * or functional fills on the public page. Accent is excluded: it is only used
 * in decorative gradients (avatar fallback, banner presets), never as text.
 * Borders are excluded: they are decorative separators, not the sole boundary
 * indicator (SC 1.4.11 does not apply).
 */
const TEXT_PAIRS = [
	{ label: "foreground on background", fg: "--ld-foreground", bg: "--ld-background", min: 4.5 },
	{
		label: "muted-foreground on background",
		fg: "--ld-muted-foreground",
		bg: "--ld-background",
		min: 4.5,
	},
	{ label: "card-foreground on card", fg: "--ld-card-foreground", bg: "--ld-card", min: 4.5 },
	{ label: "muted-foreground on card", fg: "--ld-muted-foreground", bg: "--ld-card", min: 4.5 },
	{ label: "primary as text on background", fg: "--ld-primary", bg: "--ld-background", min: 4.5 },
	{ label: "primary as fill on background", fg: "--ld-primary", bg: "--ld-background", min: 3 },
] as const;

describe("theme preset contrast (WCAG AA)", () => {
	for (const preset of themePresets) {
		for (const mode of ["light", "dark"] as const) {
			it(`${preset.name}/${mode}`, () => {
				const vars = preset.cssVars[mode];
				for (const pair of TEXT_PAIRS) {
					const fg = vars[pair.fg];
					const bg = vars[pair.bg];
					expect(fg, `${preset.name}/${mode} missing ${pair.fg}`).toBeTruthy();
					expect(bg, `${preset.name}/${mode} missing ${pair.bg}`).toBeTruthy();
					const ratio = getContrastRatio(fg as string, bg as string);
					expect(
						ratio,
						`${preset.name}/${mode} ${pair.label}: ${ratio.toFixed(2)}:1 < ${pair.min}:1 (${fg} on ${bg})`,
					).toBeGreaterThanOrEqual(pair.min);
				}
			});
		}
	}
});

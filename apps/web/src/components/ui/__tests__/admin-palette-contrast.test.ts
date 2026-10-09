import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Locks the admin palette in src/index.css (the tokens every primitive in this
 * folder paints with) to the WCAG pairs it is tuned for — the admin-side twin
 * of packages/ui's theme-contrast test for the public presets.
 */

type Rgb = [number, number, number];
type Rgba = { rgb: Rgb; alpha: number };

const css = readFileSync(resolve(__dirname, "../../../index.css"), "utf8");

function block(selector: string): Record<string, string> {
	const start = css.indexOf(`\n${selector} {`);
	if (start === -1) throw new Error(`${selector} block not found in index.css`);
	const body = css.slice(start, css.indexOf("\n}", start));
	const vars: Record<string, string> = {};
	for (const [, name, value] of body.matchAll(/(--[\w-]+):\s*([^;]+);/g)) {
		if (name && value) vars[name] = value.trim();
	}
	return vars;
}

/** OKLCH -> gamma-encoded sRGB (0..1), clamped to the gamut. */
function oklchToRgb(l: number, c: number, h: number): Rgb {
	const a = c * Math.cos((h * Math.PI) / 180);
	const b = c * Math.sin((h * Math.PI) / 180);
	const l_ = (l + 0.3963377774 * a + 0.2158037573 * b) ** 3;
	const m_ = (l - 0.1055613458 * a - 0.0638541728 * b) ** 3;
	const s_ = (l - 0.0894841775 * a - 1.291485548 * b) ** 3;
	const linear = [
		4.0767416621 * l_ - 3.3077115913 * m_ + 0.2309699292 * s_,
		-1.2684380046 * l_ + 2.6097574011 * m_ - 0.3413193965 * s_,
		-0.0041960863 * l_ - 0.7034186147 * m_ + 1.707614701 * s_,
	];
	return linear.map((v) => {
		const x = Math.min(1, Math.max(0, v));
		return x <= 0.0031308 ? 12.92 * x : 1.055 * x ** (1 / 2.4) - 0.055;
	}) as Rgb;
}

function parse(value: string): Rgba {
	const oklch = /^oklch\(([\d.]+)\s+([\d.]+)\s+([\d.]+)(?:\s*\/\s*([\d.]+))?\)$/.exec(value);
	if (oklch) {
		const [, l, c, h, alpha] = oklch;
		return { rgb: oklchToRgb(Number(l), Number(c), Number(h)), alpha: alpha ? Number(alpha) : 1 };
	}
	const hex = /^#([0-9a-f]{6})$/i.exec(value);
	if (hex?.[1]) {
		const n = hex[1];
		return {
			rgb: [0, 2, 4].map((i) => Number.parseInt(n.slice(i, i + 2), 16) / 255) as Rgb,
			alpha: 1,
		};
	}
	const rgba = /^rgba\((\d+),\s*(\d+),\s*(\d+),\s*([\d.]+)\)$/.exec(value);
	if (rgba) {
		const [, r, g, b, alpha] = rgba;
		return { rgb: [Number(r) / 255, Number(g) / 255, Number(b) / 255], alpha: Number(alpha) };
	}
	throw new Error(`unparsed colour: ${value}`);
}

/** Composite `fg` at `alpha` over an opaque `bg`, as the browser paints it. */
function over(fg: Rgb, bg: Rgb, alpha: number): Rgb {
	return fg.map((v, i) => v * alpha + (bg[i] ?? 0) * (1 - alpha)) as Rgb;
}

function luminance([r, g, b]: Rgb): number {
	const lin = (v: number) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
	return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

function ratio(a: Rgb, b: Rgb): number {
	const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
	return (hi + 0.05) / (lo + 0.05);
}

const light = block(":root");
const modes = { light, dark: { ...light, ...block(".dark") } };

describe("admin palette contrast (WCAG AA)", () => {
	for (const [mode, vars] of Object.entries(modes)) {
		const opaque = (name: string): Rgb => {
			const value = vars[name];
			if (!value) throw new Error(`${mode}: ${name} missing`);
			const { rgb, alpha } = parse(value);
			expect(alpha, `${mode}: ${name} must be opaque`).toBe(1);
			return rgb;
		};

		it(`${mode}: success/warning text clears 4.5:1 on its own tint`, () => {
			// The tints in use: bg-*/10 and /15 badges, plus the warning chip's
			// hover:bg-warning/20 on the card.
			const cardTints = { "--success": [0.1, 0.15], "--warning": [0.1, 0.15, 0.2] };
			for (const [token, cardAlphas] of Object.entries(cardTints)) {
				const fg = opaque(token);
				const surfaces = [
					["card", opaque("--card"), cardAlphas],
					["background", opaque("--background"), [0.1, 0.15]],
				] as const;
				for (const [surface, bg, alphas] of surfaces) {
					for (const alpha of alphas) {
						const r = ratio(fg, over(fg, bg, alpha));
						expect(
							r,
							`${mode} ${token} on ${token}/${alpha * 100} over ${surface}: ${r.toFixed(2)}:1`,
						).toBeGreaterThanOrEqual(4.5);
					}
				}
				const onSolid = ratio(opaque(`${token}-foreground`), fg);
				expect(onSolid, `${mode} ${token}-foreground on solid`).toBeGreaterThanOrEqual(4.5);
			}
		});

		it(`${mode}: the form-control boundary clears 3:1 on every plane`, () => {
			const border = opaque("--input-border");
			for (const plane of ["--card", "--background", "--surface-2", "--popover"]) {
				const r = ratio(border, opaque(plane));
				expect(r, `${mode} --input-border on ${plane}: ${r.toFixed(2)}:1`).toBeGreaterThanOrEqual(
					3,
				);
			}
		});

		it(`${mode}: --data-up tracks --success`, () => {
			expect(vars["--data-up"]).toBe(vars["--success"]);
		});
	}
});

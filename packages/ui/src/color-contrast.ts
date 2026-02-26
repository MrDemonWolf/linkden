/**
 * WCAG 2.1 color contrast utilities for adaptive icon fills.
 * Follows SC 1.4.11 (non-text contrast: 3:1 minimum for graphical objects).
 */

export function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
	const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
	if (!result) return null;
	return {
		r: parseInt(result[1], 16),
		g: parseInt(result[2], 16),
		b: parseInt(result[3], 16),
	};
}

export function getRelativeLuminance(hex: string): number {
	const rgb = hexToRgb(hex);
	if (!rgb) return 1;
	const [rs, gs, bs] = [rgb.r / 255, rgb.g / 255, rgb.b / 255].map((c) =>
		c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4,
	);
	return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

/** Returns the WCAG contrast ratio (1–21) between two hex colors. */
export function getContrastRatio(hex1: string, hex2: string): number {
	const l1 = getRelativeLuminance(hex1);
	const l2 = getRelativeLuminance(hex2);
	const lighter = Math.max(l1, l2);
	const darker = Math.min(l1, l2);
	return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Returns `brandHex` if it has at least 3:1 contrast against `bgHex`,
 * otherwise returns `fgHex` as a safe fallback.
 */
export function getAccessibleIconFill(brandHex: string, bgHex: string, fgHex: string): string {
	if (getContrastRatio(brandHex, bgHex) >= 3) return brandHex;
	return fgHex;
}

/** Legacy helper — true when the color's luminance is below 0.3. */
export function isLowLuminance(hex: string): boolean {
	return getRelativeLuminance(hex) < 0.3;
}

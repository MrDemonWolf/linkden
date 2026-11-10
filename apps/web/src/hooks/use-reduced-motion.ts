"use client";

const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

/**
 * One-off read for imperative motion. The global reduced-motion CSS rule can't
 * reach inline transitions or `scrollIntoView`/`scrollBy({ behavior: "smooth" })`,
 * so pass `behavior: prefersReducedMotion() ? "auto" : "smooth"` instead.
 */
export function prefersReducedMotion() {
	return (
		typeof window !== "undefined" && window.matchMedia?.(REDUCED_MOTION_QUERY).matches === true
	);
}

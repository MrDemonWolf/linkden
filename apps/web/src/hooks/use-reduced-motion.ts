"use client";

import { useMediaQuery } from "./use-media-query";

const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

/** True while the OS asks for reduced motion (follows changes live). */
export function useReducedMotion() {
	return useMediaQuery(REDUCED_MOTION_QUERY);
}

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

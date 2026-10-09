"use client";

import { useCallback, useEffect, useState } from "react";
import { useReducedMotion } from "./use-reduced-motion";

/**
 * Hook that provides staggered entrance animation props for lists of elements.
 * Each element fades in and slides up with a configurable delay between items.
 * Under `prefers-reduced-motion` the elements are simply shown: these are
 * inline styles, which the global reduced-motion CSS rule can't override.
 */
export function useEntranceAnimation(options?: { baseDelay?: number; stagger?: number }) {
	const { baseDelay = 50, stagger = 80 } = options ?? {};
	const reduceMotion = useReducedMotion();
	const [ready, setIsReady] = useState(false);
	const isReady = ready || reduceMotion;

	useEffect(() => {
		// rAF lets the opacity:0 state paint once so the transition actually runs.
		// It never fires in a background tab though, which would leave the page
		// stuck invisible until the tab is focused, so a timer backstops it.
		const frame = requestAnimationFrame(() => setIsReady(true));
		const timer = setTimeout(() => setIsReady(true), 200);
		return () => {
			cancelAnimationFrame(frame);
			clearTimeout(timer);
		};
	}, []);

	const getAnimationProps = useCallback(
		(index: number) =>
			reduceMotion
				? { style: { opacity: 1, transform: "none" } }
				: {
						style: {
							opacity: isReady ? 1 : 0,
							transform: isReady ? "translateY(0)" : "translateY(8px)",
							transition: `opacity 0.4s ease-out ${baseDelay + index * stagger}ms, transform 0.4s ease-out ${baseDelay + index * stagger}ms`,
						},
					},
		[reduceMotion, isReady, baseDelay, stagger],
	);

	return { getAnimationProps, isReady };
}

"use client";

import { useCallback, useEffect, useState } from "react";

/**
 * Hook that provides staggered entrance animation props for lists of elements.
 * Each element fades in and slides up with a configurable delay between items.
 */
export function useEntranceAnimation(options?: { baseDelay?: number; stagger?: number }) {
	const { baseDelay = 50, stagger = 80 } = options ?? {};
	const [isReady, setIsReady] = useState(false);

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
		(index: number) => ({
			style: {
				opacity: isReady ? 1 : 0,
				transform: isReady ? "translateY(0)" : "translateY(8px)",
				transition: `opacity 0.4s ease-out ${baseDelay + index * stagger}ms, transform 0.4s ease-out ${baseDelay + index * stagger}ms`,
			},
		}),
		[isReady, baseDelay, stagger],
	);

	return { getAnimationProps, isReady };
}

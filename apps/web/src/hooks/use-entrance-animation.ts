"use client";

import { useState, useEffect, useCallback } from "react";

/**
 * Hook that provides staggered entrance animation props for lists of elements.
 * Each element fades in and slides up with a configurable delay between items.
 */
export function useEntranceAnimation(options?: { baseDelay?: number; stagger?: number }) {
	const { baseDelay = 50, stagger = 80 } = options ?? {};
	const [isReady, setIsReady] = useState(false);

	useEffect(() => {
		const id = requestAnimationFrame(() => setIsReady(true));
		return () => cancelAnimationFrame(id);
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

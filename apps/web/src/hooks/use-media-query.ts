"use client";

import { useCallback, useSyncExternalStore } from "react";

/**
 * Subscribes to a CSS media query. `ssrValue` is what the server (and the
 * hydration pass) renders — pick the value that keeps the DOM identical to
 * the CSS breakpoint default so nothing flashes. Replaces the builder's
 * hand-rolled `isLg` effect; the admin shell uses it for the lg/xl slot logic.
 */
export function useMediaQuery(query: string, ssrValue = false) {
	const subscribe = useCallback(
		(onChange: () => void) => {
			const mq = window.matchMedia(query);
			mq.addEventListener("change", onChange);
			return () => mq.removeEventListener("change", onChange);
		},
		[query],
	);
	return useSyncExternalStore(
		subscribe,
		() => window.matchMedia(query).matches,
		() => ssrValue,
	);
}

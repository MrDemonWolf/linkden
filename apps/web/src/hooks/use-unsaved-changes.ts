"use client";

import { useEffect, useSyncExternalStore } from "react";

// Module-level dirty counter: every mounted `useUnsavedChanges(true)` adds one,
// so the shell's StatePill can say "Unsaved" without per-page wiring.
let dirtyCount = 0;
const listeners = new Set<() => void>();
function subscribe(listener: () => void) {
	listeners.add(listener);
	return () => {
		listeners.delete(listener);
	};
}
function bump(delta: number) {
	dirtyCount += delta;
	for (const l of listeners) l();
}

/** True while any mounted form reports unsaved changes. */
export function useAnyUnsaved() {
	return useSyncExternalStore(
		subscribe,
		() => dirtyCount > 0,
		() => false,
	);
}

/**
 * Warns the user before leaving the page when there are unsaved changes.
 * `beforeunload` covers reloads/closes; a capture-phase click guard covers
 * in-app navigation (Next `Link`, the nav lists) — it runs before React's own
 * delegated handler, so stopping it there blocks the client-side transition.
 */
export function useUnsavedChanges(isDirty: boolean) {
	useEffect(() => {
		if (!isDirty) return;
		bump(1);

		const onBeforeUnload = (e: BeforeUnloadEvent) => {
			e.preventDefault();
		};

		const onClick = (e: MouseEvent) => {
			// Modifier/middle clicks open a new tab — nothing is lost.
			if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey) return;
			const a = (e.target as Element | null)?.closest("a[href]");
			if (!(a instanceof HTMLAnchorElement)) return;
			const href = a.getAttribute("href") ?? "";
			if (href.startsWith("#") || a.target === "_blank" || a.origin !== window.location.origin) {
				return;
			}
			if (!window.confirm("Discard unsaved changes?")) {
				e.preventDefault();
				e.stopImmediatePropagation();
			}
		};

		window.addEventListener("beforeunload", onBeforeUnload);
		document.addEventListener("click", onClick, true);
		return () => {
			bump(-1);
			window.removeEventListener("beforeunload", onBeforeUnload);
			document.removeEventListener("click", onClick, true);
		};
	}, [isDirty]);
}

"use client";

import { useEffect } from "react";

/**
 * Warns the user before leaving the page when there are unsaved changes.
 * `beforeunload` covers reloads/closes; a capture-phase click guard covers
 * in-app navigation (Next `Link`, the nav lists) — it runs before React's own
 * delegated handler, so stopping it there blocks the client-side transition.
 */
export function useUnsavedChanges(isDirty: boolean) {
	useEffect(() => {
		if (!isDirty) return;

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
			window.removeEventListener("beforeunload", onBeforeUnload);
			document.removeEventListener("click", onClick, true);
		};
	}, [isDirty]);
}

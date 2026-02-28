"use client";

import { useEffect } from "react";

/**
 * Warns the user before leaving the page when there are unsaved changes.
 * Wires up the `beforeunload` event when `isDirty` is true.
 */
export function useUnsavedChanges(isDirty: boolean) {
	useEffect(() => {
		if (!isDirty) return;

		const handler = (e: BeforeUnloadEvent) => {
			e.preventDefault();
		};

		window.addEventListener("beforeunload", handler);
		return () => window.removeEventListener("beforeunload", handler);
	}, [isDirty]);
}

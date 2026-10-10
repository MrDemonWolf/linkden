"use client";

import { useEffect, useSyncExternalStore } from "react";

const DISCARD_PROMPT = "Discard unsaved changes?";

// Module-level dirty counter: every mounted `useUnsavedChanges(true)` adds one,
// so the shell's StatePill can say "Unsaved" without per-page wiring. The
// navigation guards hang off the same counter — installed once on 0 → 1 and
// removed on 1 → 0 — so two dirty forms on one page still prompt once.
let dirtyCount = 0;
// Bumped each time a form stops being dirty (saved, discarded, closed).
let settleCount = 0;
const listeners = new Set<() => void>();
let removeGuards: (() => void) | null = null;

function subscribe(listener: () => void) {
	listeners.add(listener);
	return () => {
		listeners.delete(listener);
	};
}

function bump(delta: number) {
	dirtyCount += delta;
	if (delta < 0) settleCount += 1;
	if (dirtyCount > 0 && !removeGuards) {
		removeGuards = installGuards();
	} else if (dirtyCount === 0 && removeGuards) {
		removeGuards();
		removeGuards = null;
	}
	for (const l of listeners) l();
}

/** The Navigation API's `navigate` event, as far as the guard reads it. */
type NavigateLikeEvent = Event & { navigationType?: string };

/**
 * `beforeunload` covers reloads/closes; a capture-phase click guard covers
 * in-app navigation (Next `Link`, the nav lists) — it runs before React's own
 * delegated handler, so stopping it there blocks the client-side transition.
 * Browser Back/Forward between admin pages is a same-document history
 * traversal that fires neither; where the Navigation API exists its
 * cancelable `traverse` navigation is confirmed too.
 */
function installGuards() {
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
		if (!window.confirm(DISCARD_PROMPT)) {
			e.preventDefault();
			e.stopImmediatePropagation();
		}
	};

	const onNavigate = (e: Event) => {
		const { navigationType, cancelable } = e as NavigateLikeEvent;
		if (navigationType !== "traverse" || !cancelable) return;
		if (!window.confirm(DISCARD_PROMPT)) e.preventDefault();
	};
	const navigation = (window as Window & { navigation?: EventTarget }).navigation;

	window.addEventListener("beforeunload", onBeforeUnload);
	document.addEventListener("click", onClick, true);
	navigation?.addEventListener("navigate", onNavigate);
	return () => {
		window.removeEventListener("beforeunload", onBeforeUnload);
		document.removeEventListener("click", onClick, true);
		navigation?.removeEventListener("navigate", onNavigate);
	};
}

/**
 * Snapshot of the unsaved-edit state, read at event time: whether any form is
 * dirty, and an epoch that moves on whenever any form stops being dirty (it
 * saved, discarded, or closed). Something recorded under the current epoch
 * while a form was dirty is still part of that same unsaved edit.
 */
export function unsavedEditSnapshot() {
	return { dirty: dirtyCount > 0, epoch: settleCount };
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
 * Warns the user before leaving the page while `isDirty`: reloads/closes,
 * in-app link clicks and (where supported) browser Back/Forward. However many
 * forms are dirty at once, the user is asked once.
 */
export function useUnsavedChanges(isDirty: boolean) {
	useEffect(() => {
		if (!isDirty) return;
		bump(1);
		return () => bump(-1);
	}, [isDirty]);
}

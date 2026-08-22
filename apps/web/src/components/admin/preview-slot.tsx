"use client";

import { createContext, type ReactNode, useContext, useEffect } from "react";
import type { PreviewOverrides } from "@/components/admin/page-preview";
import type { ColorMode } from "@/components/public/public-page";

/**
 * What an editing page hands to the shell-owned preview column (and, below
 * lg, the shell-owned FAB + MobilePreviewSheet). Register it every render via
 * `usePreviewSlot`; pages keep owning their form state.
 */
export interface PreviewRegistration {
	/** profile | settings | blocks | socialNetworks — layered over `public.getPage`. */
	overrides?: PreviewOverrides;
	mode?: ColorMode;
	onModeChange?: (mode: ColorMode) => void;
	/** BlockEditPanel: replaces the phone at lg, stacks above it at xl. */
	panel?: ReactNode;
	/** SEO: an alternate view (OgPreviewCard) the column header can toggle to. */
	altView?: { label: string; node: ReactNode };
}

// Two contexts so pages only ever touch the setter — consuming the state from
// a page would re-render it on every registration (a render loop).
const SetCtx = createContext<(reg: PreviewRegistration | null) => void>(() => {});
const StateCtx = createContext<PreviewRegistration | null>(null);

export const PreviewSlotSetter = SetCtx.Provider;
export const PreviewSlotState = StateCtx.Provider;

/** Mount in an editing page: the shell shows the preview column while this is mounted. */
export function usePreviewSlot(reg: PreviewRegistration) {
	const set = useContext(SetCtx);
	// Every render on purpose: overrides are fresh objects each render, and only
	// the PreviewColumn re-renders in response.
	useEffect(() => {
		set(reg);
	});
	useEffect(() => () => set(null), [set]);
}

/** Shell side: the current registration, or null when the page has no preview. */
export const usePreviewRegistration = () => useContext(StateCtx);

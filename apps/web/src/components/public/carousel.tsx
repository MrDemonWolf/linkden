"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { type ReactNode, useCallback, useEffect, useRef, useState } from "react";
import type { ThemeColors } from "./public-page";
import { glassStyle } from "./theme-toggle";

/**
 * Wraps a horizontally scrolling section with prev/next buttons. The buttons
 * only appear when the content actually overflows, and each press scrolls by
 * one item (the first child's width plus the gap). Swipe and keyboard scrolling
 * keep working as before; this just adds a pointer affordance.
 */
export function Carousel({
	themeColors,
	label,
	children,
}: {
	themeColors: ThemeColors;
	label: string;
	children: (ref: React.RefObject<HTMLUListElement | null>) => ReactNode;
}) {
	const ref = useRef<HTMLUListElement | null>(null);
	const [state, setState] = useState({ overflow: false, atStart: true, atEnd: true });

	const measure = useCallback(() => {
		const el = ref.current;
		if (!el) return;
		const max = el.scrollWidth - el.clientWidth;
		setState({ overflow: max > 4, atStart: el.scrollLeft <= 2, atEnd: el.scrollLeft >= max - 2 });
	}, []);

	useEffect(() => {
		const el = ref.current;
		if (!el) return;
		measure();
		el.addEventListener("scroll", measure, { passive: true });
		// Smooth scrolling settles after the last scroll event; scrollend (where
		// supported) re-measures once the snap has finished.
		el.addEventListener("scrollend", measure);
		const ro = new ResizeObserver(measure);
		ro.observe(el);
		return () => {
			el.removeEventListener("scroll", measure);
			el.removeEventListener("scrollend", measure);
			ro.disconnect();
		};
	}, [measure]);

	const step = (dir: 1 | -1) => {
		const el = ref.current;
		if (!el) return;
		const first = el.firstElementChild as HTMLElement | null;
		const gap = Number.parseFloat(getComputedStyle(el).columnGap || "0") || 0;
		const by = (first?.offsetWidth ?? el.clientWidth * 0.72) + gap;
		el.scrollBy({ left: dir * by, behavior: "smooth" });
	};

	const btn =
		"absolute top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full shadow-md transition-opacity disabled:pointer-events-none disabled:opacity-0 focus-visible:outline-2 focus-visible:outline-offset-2";

	return (
		<div className="relative">
			{children(ref)}
			{state.overflow && (
				<>
					<button
						type="button"
						className={`${btn} -left-3`}
						style={{ ...glassStyle(themeColors), outlineColor: themeColors.primary }}
						onClick={() => step(-1)}
						disabled={state.atStart}
						aria-label={`Previous in ${label}`}
					>
						<ChevronLeft className="h-5 w-5" aria-hidden="true" />
					</button>
					<button
						type="button"
						className={`${btn} -right-3`}
						style={{ ...glassStyle(themeColors), outlineColor: themeColors.primary }}
						onClick={() => step(1)}
						disabled={state.atEnd}
						aria-label={`Next in ${label}`}
					>
						<ChevronRight className="h-5 w-5" aria-hidden="true" />
					</button>
				</>
			)}
		</div>
	);
}

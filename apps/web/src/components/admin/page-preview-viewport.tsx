"use client";

import { useEffect, useRef, useState } from "react";

const FULL_WIDTH = 390;
const INITIAL_SCREEN_WIDTH = FULL_WIDTH - 2; // One-pixel border; observed after mount.
const MAX_HEIGHT = 570;

interface PagePreviewViewportProps {
	children: React.ReactNode;
	isLoading?: boolean;
}

/**
 * Plain document viewport for the real public page. Render at 390px and fit
 * the available width, measuring the transformed height so the scroller has
 * no extra space after the footer. Short pages keep their natural height.
 */
export function PagePreviewViewport({ children, isLoading }: PagePreviewViewportProps) {
	const viewportRef = useRef<HTMLDivElement>(null);
	const contentRef = useRef<HTMLDivElement>(null);
	const [screenWidth, setScreenWidth] = useState(INITIAL_SCREEN_WIDTH);
	const scale = screenWidth / FULL_WIDTH;
	const [contentHeight, setContentHeight] = useState(MAX_HEIGHT / scale);

	useEffect(() => {
		const el = contentRef.current;
		const viewport = viewportRef.current;
		if (!el || !viewport) return;
		const ro = new ResizeObserver((entries) => {
			for (const entry of entries) {
				if (entry.target === viewport && entry.contentRect.width > 0)
					setScreenWidth(entry.contentRect.width);
				if (entry.target === el) setContentHeight(entry.contentRect.height);
			}
		});
		ro.observe(viewport);
		ro.observe(el);
		return () => ro.disconnect();
	}, []);

	return (
		<div
			className="relative mx-auto w-full overflow-hidden rounded-xl border border-border bg-background"
			style={{ maxWidth: FULL_WIDTH }}
			aria-busy={isLoading || undefined}
		>
			<div className="overflow-y-auto overflow-x-hidden" style={{ maxHeight: MAX_HEIGHT }}>
				{/* This is a picture of the real public page. Keep its own tokens,
				    one accessible image name, and inert controls. The scroller stays
				    outside the inert subtree so wheel scrolling keeps working. */}
				<div
					ref={viewportRef}
					className="public-scope"
					role="img"
					aria-label="Live preview of your page"
					aria-hidden={isLoading || undefined}
					style={{
						width: "100%",
						height: isLoading ? 0 : contentHeight * scale,
						overflow: "hidden",
					}}
				>
					<div
						ref={contentRef}
						inert
						style={{
							width: FULL_WIDTH,
							display: "grid",
							transformOrigin: "top left",
							transform: `scale(${scale})`,
							pointerEvents: "none",
						}}
					>
						{children}
					</div>
				</div>
				{isLoading && (
					<div
						role="status"
						className="flex min-h-64 items-center justify-center text-small text-muted-foreground"
					>
						Loading preview…
					</div>
				)}
			</div>
		</div>
	);
}

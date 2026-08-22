"use client";

import { useEffect, useRef, useState } from "react";
import { DeviceFrame } from "@/components/admin/device-frame";

const FULL_WIDTH = 512;
const FRAME_WIDTH = 328; // 340 - 2×6px border
const SCREEN_HEIGHT = 570;
const SCALE = FRAME_WIDTH / FULL_WIDTH; // ≈ 0.641

interface PhoneFrameProps {
	children: React.ReactNode;
	previewDark?: boolean;
	isLoading?: boolean;
}

/**
 * Public-page preview frame. Thin wrapper over `DeviceFrame` that renders the
 * page at 512px and scales it to the 328px screen. `transform` doesn't shrink
 * the layout box, so the scaled content is measured and its wrapper sized to
 * the visual height — the frame's screen stays the scroller with no dead
 * space past the footer. For non-public-page previews (wallet, etc.) use
 * `DeviceFrame` directly.
 */
export function PhoneFrame({ children, previewDark, isLoading }: PhoneFrameProps) {
	const contentRef = useRef<HTMLDivElement>(null);
	const [contentHeight, setContentHeight] = useState(SCREEN_HEIGHT / SCALE);

	useEffect(() => {
		const el = contentRef.current;
		if (!el) return;
		const ro = new ResizeObserver(([entry]) => setContentHeight(entry.contentRect.height));
		ro.observe(el);
		return () => ro.disconnect();
	}, []);

	return (
		<DeviceFrame width={340} height={SCREEN_HEIGHT} previewDark={previewDark} isLoading={isLoading}>
			<div style={{ height: contentHeight * SCALE, overflow: "hidden" }}>
				<div
					ref={contentRef}
					style={{
						width: FULL_WIDTH,
						// Grid stretches the page (`min-h-full`) to at least one full screen.
						minHeight: SCREEN_HEIGHT / SCALE,
						display: "grid",
						transformOrigin: "top left",
						transform: `scale(${SCALE})`,
						pointerEvents: "none",
					}}
				>
					{children}
				</div>
			</div>
		</DeviceFrame>
	);
}

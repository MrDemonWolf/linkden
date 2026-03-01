"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { cn } from "@/lib/utils";
import { PreviewProvider } from "@/components/public/preview-context";

const FULL_WIDTH = 512;
const FRAME_WIDTH = 328; // 340 - 2×6px border
const SCALE = FRAME_WIDTH / FULL_WIDTH; // ≈ 0.641

function useCurrentTime() {
	const [time, setTime] = useState(() => {
		const now = new Date();
		return now.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
	});

	useEffect(() => {
		const id = setInterval(() => {
			const now = new Date();
			setTime(now.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }));
		}, 10_000);
		return () => clearInterval(id);
	}, []);

	return time;
}

function StatusBar({ dark }: { dark: boolean }) {
	const time = useCurrentTime();
	const fg = dark ? "fill-white" : "fill-gray-950";
	const fgText = dark ? "text-white" : "text-gray-950";

	return (
		<div className={cn("flex items-center justify-between px-5 pt-3 pb-1", fgText)} aria-hidden="true">
			{/* Left: time */}
			<span className="text-[10px] font-semibold leading-none w-12">{time}</span>

			{/* Center: Dynamic Island */}
			<div className={cn("h-[14px] w-[52px] rounded-full", dark ? "bg-gray-800" : "bg-gray-200")} />

			{/* Right: signal + wifi + battery */}
			<div className="flex items-center gap-[3px] w-12 justify-end">
				{/* Signal bars */}
				<svg width="13" height="10" viewBox="0 0 13 10" className={fg}>
					<rect x="0" y="7" width="2.5" height="3" rx="0.5" />
					<rect x="3.5" y="5" width="2.5" height="5" rx="0.5" />
					<rect x="7" y="2.5" width="2.5" height="7.5" rx="0.5" />
					<rect x="10.5" y="0" width="2.5" height="10" rx="0.5" />
				</svg>
				{/* WiFi */}
				<svg width="12" height="9" viewBox="0 0 16 12" className={fg}>
					<path d="M8 9.6a1.2 1.2 0 110 2.4 1.2 1.2 0 010-2.4zM8 6c1.87 0 3.56.76 4.78 2L11.6 9.18A4.8 4.8 0 008 7.8a4.8 4.8 0 00-3.6 1.38L3.22 8A6.57 6.57 0 018 6zm0-3.6c2.87 0 5.47 1.16 7.36 3.04L14.18 6.6A8.37 8.37 0 008 4.2a8.37 8.37 0 00-6.18 2.4L.64 5.44A10.16 10.16 0 018 2.4z" />
				</svg>
				{/* Battery */}
				<svg width="18" height="9" viewBox="0 0 25 12" className={fg}>
					<rect x="0" y="0.5" width="21" height="11" rx="2" strokeWidth="1" stroke="currentColor" fill="none" className={dark ? "stroke-white" : "stroke-gray-950"} />
					<rect x="1.5" y="2" width="18" height="8" rx="1" />
					<path d="M23 4v4a2 2 0 000-4z" />
				</svg>
			</div>
		</div>
	);
}

function PreviewSkeleton() {
	return (
		<div className="flex flex-col items-center px-6 pt-16 pb-8 gap-4">
			{/* Avatar placeholder */}
			<div className="h-20 w-20 rounded-full bg-muted/50 animate-pulse" />
			{/* Name */}
			<div className="h-4 w-32 rounded bg-muted/50 animate-pulse" />
			{/* Bio */}
			<div className="h-3 w-48 rounded bg-muted/50 animate-pulse" />
			{/* Link blocks */}
			<div className="mt-4 w-full space-y-3">
				<div className="h-12 w-full rounded-xl bg-muted/50 animate-pulse" />
				<div className="h-12 w-full rounded-xl bg-muted/50 animate-pulse" />
				<div className="h-12 w-full rounded-xl bg-muted/50 animate-pulse" />
			</div>
		</div>
	);
}

interface PhoneFrameProps {
	children: React.ReactNode;
	previewDark?: boolean;
	isLoading?: boolean;
}

export function PhoneFrame({ children, previewDark, isLoading }: PhoneFrameProps) {
	const [parallaxY, setParallaxY] = useState(0);
	const scrollRef = useRef<HTMLDivElement>(null);

	const handleScroll = useCallback(() => {
		if (scrollRef.current) {
			setParallaxY(scrollRef.current.scrollTop * -0.15);
		}
	}, []);

	return (
		<div className="relative w-[340px] mx-auto">
			<div
				className={cn(
					"overflow-hidden rounded-[2rem] border-[6px]",
					previewDark
						? "border-gray-700 bg-gray-950"
						: "border-gray-300 bg-white",
				)}
			>
				{/* Status bar */}
				<StatusBar dark={!!previewDark} />

				{/* Scaled content area */}
				<div
					ref={scrollRef}
					onScroll={handleScroll}
					className="overflow-y-auto overflow-x-hidden"
					style={{
						height: 570,
						width: FRAME_WIDTH,
					}}
				>
					<div
						style={{
							width: FULL_WIDTH,
							transformOrigin: "top left",
							transform: `scale(${SCALE}) translateY(${parallaxY}px)`,
							transition: "transform 50ms ease-out",
							pointerEvents: "none",
						}}
					>
						<PreviewProvider>
							<div className={cn(
								"transition-opacity duration-300",
								isLoading ? "opacity-0 absolute" : "opacity-100",
							)}>
								{children}
							</div>
							{isLoading && <PreviewSkeleton />}
						</PreviewProvider>
					</div>
				</div>
			</div>
		</div>
	);
}

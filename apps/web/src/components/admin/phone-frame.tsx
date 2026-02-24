"use client";

import { cn } from "@/lib/utils";
import { PreviewProvider } from "@/components/public/preview-context";

const FULL_WIDTH = 512;
const FRAME_WIDTH = 268; // 280 - 2×6px border
const SCALE = FRAME_WIDTH / FULL_WIDTH; // ≈ 0.523

interface PhoneFrameProps {
	children: React.ReactNode;
	previewDark?: boolean;
}

export function PhoneFrame({ children, previewDark }: PhoneFrameProps) {
	return (
		<div className="relative w-[280px] mx-auto">
			<div
				className={cn(
					"overflow-hidden rounded-[2rem] border-[6px]",
					previewDark
						? "border-gray-700 bg-gray-950"
						: "border-gray-300 bg-white",
				)}
			>
				{/* Notch */}
				<div className="flex justify-center py-2">
					<div
						className={cn(
							"h-5 w-24 rounded-full",
							previewDark ? "bg-gray-800" : "bg-gray-200",
						)}
					/>
				</div>
				{/* Scaled content area */}
				<div
					className="overflow-y-auto overflow-x-hidden"
					style={{
						height: 480,
						width: FRAME_WIDTH,
					}}
				>
					<div
						style={{
							width: FULL_WIDTH,
							transformOrigin: "top left",
							transform: `scale(${SCALE})`,
							pointerEvents: "none",
						}}
					>
						<PreviewProvider>
							{children}
						</PreviewProvider>
					</div>
				</div>
			</div>
		</div>
	);
}

"use client";

import { DeviceFrame } from "@/components/admin/device-frame";
import { PreviewProvider } from "@/components/public/preview-context";

const FULL_WIDTH = 512;
const FRAME_WIDTH = 328; // 340 - 2×6px border
const SCALE = FRAME_WIDTH / FULL_WIDTH; // ≈ 0.641

interface PhoneFrameProps {
	children: React.ReactNode;
	previewDark?: boolean;
	isLoading?: boolean;
}

/**
 * Public-page preview frame. Thin wrapper over `DeviceFrame` that adds the
 * 512→328 content scale + `PreviewProvider` context used by the public
 * profile renderer. For non-public-page previews (wallet, etc.) use
 * `DeviceFrame` directly.
 */
export function PhoneFrame({ children, previewDark, isLoading }: PhoneFrameProps) {
	return (
		<DeviceFrame width={340} height={570} previewDark={previewDark} isLoading={isLoading}>
			<div
				style={{
					width: FULL_WIDTH,
					transformOrigin: "top left",
					transform: `scale(${SCALE})`,
					pointerEvents: "none",
				}}
			>
				<PreviewProvider>{children}</PreviewProvider>
			</div>
		</DeviceFrame>
	);
}

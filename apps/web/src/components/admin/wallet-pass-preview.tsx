"use client";

import { useState, useEffect } from "react";
import QRCode from "qrcode";

interface WalletPassPreviewProps {
	backgroundColor?: string;
	foregroundColor?: string;
	labelColor?: string;
	logoUrl?: string;
	organizationName?: string;
	profileName?: string;
	profileEmail?: string;
	profileImage?: string;
	passDescription?: string;
	qrUrl?: string;
	showEmail?: boolean;
	showName?: boolean;
	showQrCode?: boolean;
}

const DEFAULT_BG = "#091533";
const DEFAULT_FG = "#FFFFFF";
const DEFAULT_LABEL = "#0FACED";

/**
 * Content-only wallet pass card. Render inside a `DeviceFrame` for the full
 * iPhone preview — this component intentionally has no device chrome.
 */
export function WalletPassPreview({
	backgroundColor,
	foregroundColor,
	labelColor,
	logoUrl,
	organizationName,
	profileName,
	profileEmail,
	profileImage,
	passDescription,
	qrUrl,
	showEmail = true,
	showName = true,
	showQrCode = true,
}: WalletPassPreviewProps) {
	const bg = backgroundColor || DEFAULT_BG;
	const fg = foregroundColor || DEFAULT_FG;
	const label = labelColor || DEFAULT_LABEL;

	const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);

	useEffect(() => {
		if (!qrUrl) {
			setQrDataUrl(null);
			return;
		}

		QRCode.toDataURL(qrUrl, {
			width: 200,
			margin: 0,
			color: { dark: "#000000", light: "#FFFFFF" },
			errorCorrectionLevel: "M",
		})
			.then(setQrDataUrl)
			.catch(() => setQrDataUrl(null));
	}, [qrUrl]);

	// Build secondary fields list based on toggles
	const secondaryFields: { label: string; value: string }[] = [];
	if (showEmail) {
		secondaryFields.push({
			label: "Email",
			value: profileEmail || "email@example.com",
		});
	}
	if (passDescription) {
		secondaryFields.push({
			label: "Description",
			value: passDescription,
		});
	}

	return (
		<div
			className="relative overflow-hidden rounded-[16px]"
			style={{ backgroundColor: bg }}
		>
			{/* Top highlight */}
			<div
				className="pointer-events-none absolute inset-x-0 top-0 h-[1px]"
				style={{ backgroundColor: `${fg}18` }}
			/>

			{/* Header: Logo + Org Name + Header Field */}
			<div className="flex items-center justify-between px-4 pt-4 pb-0.5">
				<div className="flex items-center gap-2">
					{logoUrl ? (
						<img
							src={logoUrl}
							alt="Logo"
							className="h-[22px] w-auto max-w-[60px] object-contain"
						/>
					) : (
						<div
							className="flex h-[22px] w-[22px] items-center justify-center rounded-md text-[9px] font-bold"
							style={{ backgroundColor: `${fg}20`, color: fg }}
						>
							W
						</div>
					)}
					<span
						className="text-[12px] font-semibold tracking-tight"
						style={{ color: fg }}
					>
						{organizationName || "Organization"}
					</span>
				</div>
				{showQrCode && (
					<div className="text-right">
						<p
							className="text-[7px] font-medium uppercase tracking-[0.08em]"
							style={{ color: label, opacity: 0.8 }}
						>
							Profile
						</p>
						<p
							className="text-[9px] font-medium"
							style={{ color: fg, opacity: 0.7 }}
						>
							LinkDen
						</p>
					</div>
				)}
			</div>

			{/* Primary Field + Thumbnail */}
			<div className="flex items-start justify-between px-4 pt-4 pb-2">
				{showName ? (
					<div className="min-w-0 flex-1 pr-3">
						<p
							className="text-[7px] font-medium uppercase tracking-[0.1em]"
							style={{ color: label }}
						>
							Name
						</p>
						<p
							className="mt-0.5 text-[18px] font-bold leading-tight tracking-tight"
							style={{ color: fg }}
						>
							{profileName || "Your Name"}
						</p>
					</div>
				) : (
					<div className="flex-1" />
				)}
				<div className="flex-shrink-0">
					{profileImage ? (
						<img
							src={profileImage}
							alt="Profile"
							className="h-[60px] w-[60px] rounded-lg object-cover shadow-md"
							style={{
								boxShadow: `0 2px 8px ${bg === "#000000" ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.25)"}`,
							}}
						/>
					) : (
						<div
							className="flex h-[60px] w-[60px] items-center justify-center rounded-lg text-[9px] font-medium"
							style={{
								backgroundColor: `${fg}10`,
								color: `${fg}30`,
								border: `1px dashed ${fg}20`,
							}}
						>
							Photo
						</div>
					)}
				</div>
			</div>

			{/* Secondary Fields */}
			{secondaryFields.length > 0 && (
				<div
					className={`grid gap-x-3 gap-y-2 px-4 pt-2 pb-1 ${
						secondaryFields.length === 1 ? "grid-cols-1" : "grid-cols-2"
					}`}
				>
					{secondaryFields.map((field) => (
						<div key={field.label} className="min-w-0">
							<p
								className="text-[7px] font-medium uppercase tracking-[0.1em]"
								style={{ color: label }}
							>
								{field.label}
							</p>
							<p
								className="mt-0.5 truncate text-[11px] font-medium"
								style={{ color: fg }}
							>
								{field.value}
							</p>
						</div>
					))}
				</div>
			)}

			{/* Separator */}
			{showQrCode && (
				<div className="px-4 pt-4 pb-0">
					<div
						className="h-px w-full"
						style={{ backgroundColor: `${fg}15` }}
					/>
				</div>
			)}

			{/* QR Code */}
			{showQrCode && (
				<div className="flex flex-col items-center px-4 pt-3 pb-4">
					<div
						className="rounded-lg bg-white p-2.5 shadow-sm"
						style={{ boxShadow: "0 1px 6px rgba(0,0,0,0.12)" }}
					>
						{qrDataUrl ? (
							<img
								src={qrDataUrl}
								alt="QR Code"
								className="h-[80px] w-[80px]"
							/>
						) : (
							<div className="grid h-[80px] w-[80px] grid-cols-8 grid-rows-8 gap-[1px] p-0.5">
								{Array.from({ length: 64 }).map((_, i) => (
									<div
										key={i}
										className="rounded-[0.5px]"
										style={{
											backgroundColor: [
												0, 1, 2, 3, 4, 5, 6, 8, 14, 16, 22, 24, 25, 27, 29,
												30, 33, 35, 37, 38, 40, 41, 42, 47, 48, 50, 54, 56,
												57, 58, 59, 60, 61, 62, 63,
											].includes(i)
												? "#000"
												: "#fff",
										}}
									/>
								))}
							</div>
						)}
					</div>
					<p
						className="mt-2 text-[8px] font-medium tracking-wide"
						style={{ color: `${fg}50` }}
					>
						Scan to view profile
					</p>
				</div>
			)}

			{!showQrCode && <div className="pb-4" />}

			{/* Bottom highlight */}
			<div
				className="pointer-events-none absolute inset-x-0 bottom-0 h-[1px]"
				style={{ backgroundColor: `${fg}08` }}
			/>
		</div>
	);
}

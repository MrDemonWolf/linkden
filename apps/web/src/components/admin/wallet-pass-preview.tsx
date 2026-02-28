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
}

const DEFAULT_BG = "#0FACED";
const DEFAULT_FG = "#091533";
const DEFAULT_LABEL = "#FFFFFF";

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
			width: 144,
			margin: 0,
			color: { dark: "#000000", light: "#FFFFFF" },
		})
			.then(setQrDataUrl)
			.catch(() => setQrDataUrl(null));
	}, [qrUrl]);

	return (
		<div
			className="mx-auto w-[320px] rounded-[16px] shadow-xl"
			style={{ backgroundColor: bg }}
		>
			{/* Header row: Logo + Logo Text */}
			<div className="flex items-center justify-between px-5 pt-4 pb-2">
				<div className="flex items-center gap-2">
					{logoUrl ? (
						<img
							src={logoUrl}
							alt="Logo"
							className="h-[25px] w-auto max-w-[80px] object-contain"
						/>
					) : (
						<div
							className="flex h-[25px] w-[25px] items-center justify-center rounded text-[10px] font-bold"
							style={{ backgroundColor: fg, color: bg }}
						>
							W
						</div>
					)}
					<span
						className="text-sm font-medium"
						style={{ color: fg }}
					>
						{organizationName || "Organization"}
					</span>
				</div>
			</div>

			{/* Primary field + Thumbnail */}
			<div className="flex items-start justify-between px-5 pt-4 pb-2">
				<div className="min-w-0 flex-1">
					<p
						className="text-[9px] uppercase tracking-wider"
						style={{ color: label }}
					>
						Name
					</p>
					<p
						className="mt-0.5 text-lg font-semibold leading-tight"
						style={{ color: fg }}
					>
						{profileName || "Your Name"}
					</p>
				</div>
				<div className="ml-4 flex-shrink-0">
					{profileImage ? (
						<img
							src={profileImage}
							alt="Profile"
							className="h-[70px] w-[70px] rounded-md object-cover"
						/>
					) : (
						<div
							className="flex h-[70px] w-[70px] items-center justify-center rounded-md text-xs font-medium"
							style={{
								backgroundColor: `${fg}15`,
								color: `${fg}40`,
							}}
						>
							Photo
						</div>
					)}
				</div>
			</div>

			{/* Secondary fields row */}
			<div className="grid grid-cols-2 gap-3 px-5 pt-4">
				<div className="min-w-0">
					<p
						className="text-[9px] uppercase tracking-wider"
						style={{ color: label }}
					>
						Email
					</p>
					<p
						className="mt-0.5 truncate text-sm"
						style={{ color: fg }}
					>
						{profileEmail || "email@example.com"}
					</p>
				</div>
				<div className="min-w-0">
					<p
						className="text-[9px] uppercase tracking-wider"
						style={{ color: label }}
					>
						Description
					</p>
					<p
						className="mt-0.5 truncate text-sm"
						style={{ color: fg }}
					>
						{passDescription || "Contact Card"}
					</p>
				</div>
			</div>

			{/* Separator */}
			<div className="px-5 pt-6 pb-1">
				<div
					className="h-px w-full"
					style={{ backgroundColor: `${fg}30` }}
				/>
			</div>

			{/* Barcode area */}
			<div className="flex justify-center px-5 pt-3 pb-5">
				<div className="rounded-lg bg-white p-3">
					{qrDataUrl ? (
						<img
							src={qrDataUrl}
							alt="QR Code"
							className="h-[72px] w-[72px]"
						/>
					) : (
						<div className="grid h-[72px] w-[72px] grid-cols-6 grid-rows-6 gap-[2px]">
							{Array.from({ length: 36 }).map((_, i) => (
								<div
									key={i}
									className="rounded-[1px]"
									style={{
										backgroundColor:
											[
												0, 1, 2, 3, 5, 6, 8, 11, 12, 15,
												17, 18, 20, 23, 24, 25, 27, 29, 30,
												33, 34, 35,
											].includes(i)
												? "#000"
												: "#fff",
									}}
								/>
							))}
						</div>
					)}
				</div>
			</div>
		</div>
	);
}

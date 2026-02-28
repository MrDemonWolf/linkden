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
			width: 144,
			margin: 0,
			color: { dark: "#000000", light: "#FFFFFF" },
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
			className="mx-auto w-[320px] rounded-[16px] shadow-xl"
			style={{ backgroundColor: bg }}
		>
			{/* Header row: Logo + Logo Text (Apple HIG: logo + logoText) */}
			<div className="flex items-center gap-2 px-5 pt-4 pb-2">
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

			{/* Primary field + Thumbnail (Apple HIG: primary field left, thumbnail right) */}
			{showName && (
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
			)}

			{/* Thumbnail only (when name is hidden but we still show the photo) */}
			{!showName && (
				<div className="flex items-start justify-between px-5 pt-4 pb-2">
					<div />
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
			)}

			{/* Secondary fields (Apple HIG: up to 4, grid layout) */}
			{secondaryFields.length > 0 && (
				<div
					className={`grid gap-3 px-5 pt-4 ${secondaryFields.length === 1 ? "grid-cols-1" : "grid-cols-2"}`}
				>
					{secondaryFields.map((field) => (
						<div key={field.label} className="min-w-0">
							<p
								className="text-[9px] uppercase tracking-wider"
								style={{ color: label }}
							>
								{field.label}
							</p>
							<p
								className="mt-0.5 truncate text-sm"
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
				<div className="px-5 pt-6 pb-1">
					<div
						className="h-px w-full"
						style={{ backgroundColor: `${fg}30` }}
					/>
				</div>
			)}

			{/* Barcode area (Apple HIG: barcode at bottom) */}
			{showQrCode && (
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
			)}

			{/* Bottom padding when no QR */}
			{!showQrCode && <div className="pb-5" />}
		</div>
	);
}

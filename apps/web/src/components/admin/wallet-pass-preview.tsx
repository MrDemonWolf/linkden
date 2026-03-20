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
		<div className="relative mx-auto w-[340px]">
			{/* Outer card shell with Apple Wallet styling */}
			<div
				className="relative overflow-hidden rounded-[20px] shadow-2xl"
				style={{ backgroundColor: bg }}
			>
				{/* Subtle top highlight for glossy effect */}
				<div
					className="pointer-events-none absolute inset-x-0 top-0 h-[1px]"
					style={{ backgroundColor: `${fg}18` }}
				/>

				{/* ===== HEADER ROW: Logo + Org Name + Header Field ===== */}
				<div className="flex items-center justify-between px-6 pt-5 pb-1">
					<div className="flex items-center gap-2.5">
						{logoUrl ? (
							<img
								src={logoUrl}
								alt="Logo"
								className="h-[28px] w-auto max-w-[80px] object-contain"
							/>
						) : (
							<div
								className="flex h-[28px] w-[28px] items-center justify-center rounded-md text-[11px] font-bold"
								style={{ backgroundColor: `${fg}20`, color: fg }}
							>
								W
							</div>
						)}
						<span
							className="text-[15px] font-semibold tracking-tight"
							style={{ color: fg }}
						>
							{organizationName || "Organization"}
						</span>
					</div>
					{/* Header field (right-aligned, Apple HIG pattern) */}
					{showQrCode && (
						<div className="text-right">
							<p
								className="text-[8px] font-medium uppercase tracking-[0.08em]"
								style={{ color: label, opacity: 0.8 }}
							>
								Profile
							</p>
							<p
								className="text-[11px] font-medium"
								style={{ color: fg, opacity: 0.7 }}
							>
								LinkDen
							</p>
						</div>
					)}
				</div>

				{/* ===== PRIMARY FIELD + THUMBNAIL ===== */}
				<div className="flex items-start justify-between px-6 pt-5 pb-3">
					{/* Primary field (left) */}
					{showName ? (
						<div className="min-w-0 flex-1 pr-4">
							<p
								className="text-[9px] font-medium uppercase tracking-[0.1em]"
								style={{ color: label }}
							>
								Name
							</p>
							<p
								className="mt-1 text-[22px] font-bold leading-tight tracking-tight"
								style={{ color: fg }}
							>
								{profileName || "Your Name"}
							</p>
						</div>
					) : (
						<div className="flex-1" />
					)}

					{/* Thumbnail (right) */}
					<div className="flex-shrink-0">
						{profileImage ? (
							<img
								src={profileImage}
								alt="Profile"
								className="h-[76px] w-[76px] rounded-lg object-cover shadow-md"
								style={{
									boxShadow: `0 2px 12px ${bg === "#000000" ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.25)"}`,
								}}
							/>
						) : (
							<div
								className="flex h-[76px] w-[76px] items-center justify-center rounded-lg text-[10px] font-medium"
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

				{/* ===== SECONDARY FIELDS (grid, up to 4) ===== */}
				{secondaryFields.length > 0 && (
					<div
						className={`grid gap-x-4 gap-y-3 px-6 pt-3 pb-1 ${
							secondaryFields.length === 1
								? "grid-cols-1"
								: "grid-cols-2"
						}`}
					>
						{secondaryFields.map((field) => (
							<div key={field.label} className="min-w-0">
								<p
									className="text-[9px] font-medium uppercase tracking-[0.1em]"
									style={{ color: label }}
								>
									{field.label}
								</p>
								<p
									className="mt-0.5 truncate text-[13px] font-medium"
									style={{ color: fg }}
								>
									{field.value}
								</p>
							</div>
						))}
					</div>
				)}

				{/* ===== SEPARATOR ===== */}
				{showQrCode && (
					<div className="px-6 pt-5 pb-0">
						<div
							className="h-px w-full"
							style={{ backgroundColor: `${fg}15` }}
						/>
					</div>
				)}

				{/* ===== QR CODE SECTION ===== */}
				{showQrCode && (
					<div className="flex flex-col items-center px-6 pt-4 pb-6">
						<div
							className="rounded-xl bg-white p-3 shadow-sm"
							style={{
								boxShadow: `0 1px 8px rgba(0,0,0,0.12)`,
							}}
						>
							{qrDataUrl ? (
								<img
									src={qrDataUrl}
									alt="QR Code"
									className="h-[100px] w-[100px]"
								/>
							) : (
								<div className="grid h-[100px] w-[100px] grid-cols-8 grid-rows-8 gap-[1.5px] p-1">
									{Array.from({ length: 64 }).map((_, i) => (
										<div
											key={i}
											className="rounded-[0.5px]"
											style={{
												backgroundColor:
													[
														0, 1, 2, 3, 4, 5, 6, 8,
														14, 16, 22, 24, 25, 27,
														29, 30, 33, 35, 37, 38,
														40, 41, 42, 47, 48, 50,
														54, 56, 57, 58, 59, 60,
														61, 62, 63,
													].includes(i)
														? "#000"
														: "#fff",
											}}
										/>
									))}
								</div>
							)}
						</div>
						{/* QR caption text */}
						<p
							className="mt-2.5 text-[10px] font-medium tracking-wide"
							style={{ color: `${fg}50` }}
						>
							Scan to view profile
						</p>
					</div>
				)}

				{/* Bottom padding when no QR */}
				{!showQrCode && <div className="pb-6" />}

				{/* Subtle bottom highlight */}
				<div
					className="pointer-events-none absolute inset-x-0 bottom-0 h-[1px]"
					style={{ backgroundColor: `${fg}08` }}
				/>
			</div>
		</div>
	);
}

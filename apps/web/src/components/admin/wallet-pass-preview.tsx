"use client";

import { useState, useEffect } from "react";
import QRCode from "qrcode";

export interface PassFieldView {
	key: string;
	label: string;
	value: string;
}

export type PassZone = "header" | "primary" | "secondary" | "auxiliary" | "back";

interface WalletPassPreviewProps {
	backgroundColor?: string;
	foregroundColor?: string;
	labelColor?: string;
	logoUrl?: string;
	iconUrl?: string;
	thumbnailUrl?: string;
	stripUrl?: string;
	organizationName?: string;
	profileImage?: string;
	headerFields?: PassFieldView[];
	primaryFields?: PassFieldView[];
	secondaryFields?: PassFieldView[];
	auxiliaryFields?: PassFieldView[];
	backFields?: PassFieldView[];
	qrUrl?: string;
	showQrCode?: boolean;
	highlightedZone?: PassZone | null;
}

const DEFAULT_BG = "#091533";
const DEFAULT_FG = "#FFFFFF";
const DEFAULT_LABEL = "#0FACED";

export function WalletPassPreview({
	backgroundColor,
	foregroundColor,
	labelColor,
	logoUrl,
	thumbnailUrl,
	stripUrl,
	organizationName,
	profileImage,
	headerFields = [],
	primaryFields = [],
	secondaryFields = [],
	auxiliaryFields = [],
	backFields = [],
	qrUrl,
	showQrCode = true,
	highlightedZone,
}: WalletPassPreviewProps) {
	const bg = backgroundColor || DEFAULT_BG;
	const fg = foregroundColor || DEFAULT_FG;
	const label = labelColor || DEFAULT_LABEL;
	const thumb = thumbnailUrl || profileImage;

	const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
	const [showBack, setShowBack] = useState(false);

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

	const zoneRing = (zone: PassZone) =>
		highlightedZone === zone
			? "outline outline-2 outline-offset-2 outline-cyan-400/60 rounded-md transition-all"
			: "outline outline-2 outline-offset-2 outline-transparent rounded-md transition-all";

	if (showBack) {
		return (
			<div
				className="relative overflow-hidden rounded-[16px]"
				style={{ backgroundColor: bg, color: fg }}
			>
				<div className="flex items-center justify-between px-4 pt-4">
					<span className="text-[12px] font-semibold tracking-tight">
						{organizationName || "Back"}
					</span>
					<button
						type="button"
						onClick={() => setShowBack(false)}
						className="text-[10px] uppercase tracking-wider opacity-70 hover:opacity-100"
					>
						Front ›
					</button>
				</div>
				<div className={`px-4 pt-3 pb-4 ${zoneRing("back")}`}>
					{backFields.length === 0 && (
						<p className="text-[10px] opacity-50">No back-of-pass fields yet.</p>
					)}
					{backFields.map((f) => (
						<div key={f.key} className="mb-2.5 last:mb-0">
							<p
								className="text-[8px] font-medium uppercase tracking-[0.1em]"
								style={{ color: label }}
							>
								{f.label}
							</p>
							<p
								className="mt-0.5 whitespace-pre-wrap break-words text-[10.5px] leading-snug"
								style={{ color: fg }}
							>
								{f.value || "—"}
							</p>
						</div>
					))}
				</div>
			</div>
		);
	}

	const stripMode = !!stripUrl;

	return (
		<div className="relative overflow-hidden rounded-[16px]" style={{ backgroundColor: bg }}>
			<div
				className="pointer-events-none absolute inset-x-0 top-0 h-[1px]"
				style={{ backgroundColor: `${fg}18` }}
			/>

			{/* Header */}
			<div className={`flex items-center justify-between px-4 pt-4 pb-0.5 ${zoneRing("header")}`}>
				<div className="flex items-center gap-2">
					{logoUrl ? (
						<img src={logoUrl} alt="Logo" className="h-[22px] w-auto max-w-[60px] object-contain" />
					) : (
						<div
							className="flex h-[22px] w-[22px] items-center justify-center rounded-md text-[9px] font-bold"
							style={{ backgroundColor: `${fg}20`, color: fg }}
						>
							W
						</div>
					)}
					<span className="text-[12px] font-semibold tracking-tight" style={{ color: fg }}>
						{organizationName || "Organization"}
					</span>
				</div>
				<div className="flex items-start gap-2">
					{headerFields.slice(0, 3).map((f) => (
						<div key={f.key} className="text-right">
							<p
								className="text-[7px] font-medium uppercase tracking-[0.08em]"
								style={{ color: label, opacity: 0.85 }}
							>
								{f.label}
							</p>
							<p className="text-[9px] font-medium" style={{ color: fg, opacity: 0.85 }}>
								{f.value || "—"}
							</p>
						</div>
					))}
				</div>
			</div>

			{/* Strip layout */}
			{stripMode && (
				<div className="relative mt-3 h-[88px] w-full overflow-hidden">
					<img src={stripUrl} alt="Strip" className="h-full w-full object-cover" />
					<div className={`absolute inset-0 flex items-end px-4 py-2 ${zoneRing("primary")}`}>
						{primaryFields[0] && (
							<div className="min-w-0 flex-1">
								<p
									className="text-[7px] font-medium uppercase tracking-[0.1em]"
									style={{
										color: label,
										textShadow: "0 1px 2px rgba(0,0,0,0.6)",
									}}
								>
									{primaryFields[0].label}
								</p>
								<p
									className="text-[16px] font-bold leading-tight tracking-tight"
									style={{
										color: fg,
										textShadow: "0 1px 4px rgba(0,0,0,0.7)",
									}}
								>
									{primaryFields[0].value || "—"}
								</p>
							</div>
						)}
					</div>
				</div>
			)}

			{/* Primary + Thumbnail (non-strip) */}
			{!stripMode && (
				<div className="flex items-start justify-between px-4 pt-4 pb-2">
					<div className={`min-w-0 flex-1 pr-3 ${zoneRing("primary")}`}>
						{primaryFields[0] ? (
							<>
								<p
									className="text-[7px] font-medium uppercase tracking-[0.1em]"
									style={{ color: label }}
								>
									{primaryFields[0].label}
								</p>
								<p
									className="mt-0.5 text-[18px] font-bold leading-tight tracking-tight"
									style={{ color: fg }}
								>
									{primaryFields[0].value || "Your Name"}
								</p>
							</>
						) : (
							<p className="text-[10px]" style={{ color: `${fg}40` }}>
								No primary field
							</p>
						)}
					</div>
					<div className="flex-shrink-0">
						{thumb ? (
							<img
								src={thumb}
								alt="Thumbnail"
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
			)}

			{/* Secondary fields */}
			{secondaryFields.length > 0 && (
				<div
					className={`grid gap-x-3 gap-y-2 px-4 pt-2 pb-1 ${zoneRing("secondary")} ${
						secondaryFields.length === 1
							? "grid-cols-1"
							: secondaryFields.length === 2
								? "grid-cols-2"
								: secondaryFields.length === 3
									? "grid-cols-3"
									: "grid-cols-4"
					}`}
				>
					{secondaryFields.map((field) => (
						<div key={field.key} className="min-w-0">
							<p
								className="text-[7px] font-medium uppercase tracking-[0.1em]"
								style={{ color: label }}
							>
								{field.label}
							</p>
							<p
								className="mt-0.5 truncate text-[11px] font-medium"
								style={{ color: fg }}
								title={field.value}
							>
								{field.value || "—"}
							</p>
						</div>
					))}
				</div>
			)}

			{/* Auxiliary fields */}
			{auxiliaryFields.length > 0 && (
				<div
					className={`grid gap-x-3 gap-y-2 px-4 pt-1 pb-1 ${zoneRing("auxiliary")} ${
						auxiliaryFields.length === 1
							? "grid-cols-1"
							: auxiliaryFields.length === 2
								? "grid-cols-2"
								: auxiliaryFields.length === 3
									? "grid-cols-3"
									: "grid-cols-4"
					}`}
				>
					{auxiliaryFields.map((field) => (
						<div key={field.key} className="min-w-0">
							<p
								className="text-[6.5px] font-medium uppercase tracking-[0.1em]"
								style={{ color: label, opacity: 0.85 }}
							>
								{field.label}
							</p>
							<p
								className="mt-0.5 truncate text-[10px] font-medium"
								style={{ color: fg, opacity: 0.9 }}
								title={field.value}
							>
								{field.value || "—"}
							</p>
						</div>
					))}
				</div>
			)}

			{/* Separator + QR */}
			{showQrCode && (
				<div className="px-4 pt-4 pb-0">
					<div className="h-px w-full" style={{ backgroundColor: `${fg}15` }} />
				</div>
			)}
			{showQrCode && (
				<div className="flex flex-col items-center px-4 pt-3 pb-4">
					<div
						className="rounded-lg bg-white p-2.5"
						style={{ boxShadow: "0 1px 6px rgba(0,0,0,0.12)" }}
					>
						{qrDataUrl ? (
							<img src={qrDataUrl} alt="QR Code" className="h-[80px] w-[80px]" />
						) : (
							<div className="grid h-[80px] w-[80px] grid-cols-8 grid-rows-8 gap-[1px] p-0.5">
								{Array.from({ length: 64 }).map((_, i) => (
									<div
										key={i}
										className="rounded-[0.5px]"
										style={{
											backgroundColor: [
												0, 1, 2, 3, 4, 5, 6, 8, 14, 16, 22, 24, 25, 27, 29, 30, 33, 35, 37, 38, 40,
												41, 42, 47, 48, 50, 54, 56, 57, 58, 59, 60, 61, 62, 63,
											].includes(i)
												? "#000"
												: "#fff",
										}}
									/>
								))}
							</div>
						)}
					</div>
					<p className="mt-2 text-[8px] font-medium tracking-wide" style={{ color: `${fg}50` }}>
						Scan to view profile
					</p>
				</div>
			)}

			{!showQrCode && <div className="pb-4" />}

			{backFields.length > 0 && (
				<button
					type="button"
					onClick={() => setShowBack(true)}
					className="absolute right-2 top-2 rounded px-1.5 py-0.5 text-[8px] uppercase tracking-wider opacity-50 hover:opacity-100"
					style={{ color: fg }}
				>
					Back ›
				</button>
			)}

			<div
				className="pointer-events-none absolute inset-x-0 bottom-0 h-[1px]"
				style={{ backgroundColor: `${fg}08` }}
			/>
		</div>
	);
}

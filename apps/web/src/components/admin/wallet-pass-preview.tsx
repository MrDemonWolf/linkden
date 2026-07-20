"use client";

import { useState, useEffect, type CSSProperties } from "react";
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

// Authentic Wallet passes render in the system font — matching it is the design.
const PASS_FONT =
	'-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", system-ui, sans-serif';

// Accept hex (#abc / #aabbcc) or rgb(...) — pass.json uses rgb() but the admin stores hex.
function parseColor(c: string): [number, number, number] {
	if (c.startsWith("rgb")) {
		const m = c.match(/\d+/g);
		if (m && m.length >= 3) return [+m[0], +m[1], +m[2]];
		return [9, 21, 51];
	}
	let h = c.replace("#", "");
	if (h.length === 3)
		h = h
			.split("")
			.map((x) => x + x)
			.join("");
	return [
		parseInt(h.slice(0, 2), 16) || 0,
		parseInt(h.slice(2, 4), 16) || 0,
		parseInt(h.slice(4, 6), 16) || 0,
	];
}
const rgba = (c: string, a: number) => {
	const [r, g, b] = parseColor(c);
	return `rgba(${r}, ${g}, ${b}, ${a})`;
};
// amt > 0 lightens toward white, amt < 0 darkens toward black.
const mix = (c: string, amt: number) => {
	const [r, g, b] = parseColor(c);
	const t = amt > 0 ? 255 : 0;
	const p = Math.abs(amt);
	return `rgb(${Math.round(r + (t - r) * p)}, ${Math.round(g + (t - g) * p)}, ${Math.round(b + (t - b) * p)})`;
};
const luminance = (c: string) => {
	const [r, g, b] = parseColor(c);
	return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
};

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
	const isDark = luminance(bg) < 0.55;

	const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
	const [showBack, setShowBack] = useState(false);

	useEffect(() => {
		if (!qrUrl) {
			setQrDataUrl(null);
			return;
		}
		QRCode.toDataURL(qrUrl, {
			width: 240,
			margin: 0,
			color: { dark: "#000000", light: "#FFFFFF" },
			errorCorrectionLevel: "M",
		})
			.then(setQrDataUrl)
			.catch(() => setQrDataUrl(null));
	}, [qrUrl]);

	// Layered card surface: crown highlight + diagonal gradient, dot-grain texture, edge lift.
	const cardStyle: CSSProperties = {
		fontFamily: PASS_FONT,
		WebkitFontSmoothing: "antialiased",
		backgroundImage: `radial-gradient(130% 90% at 50% -15%, ${rgba(fg, 0.12)} 0%, transparent 55%), linear-gradient(158deg, ${mix(bg, 0.1)} 0%, ${bg} 44%, ${mix(bg, isDark ? -0.16 : -0.08)} 100%)`,
		color: fg,
		boxShadow: `inset 0 1px 0 ${rgba(fg, 0.16)}, inset 0 0 0 1px ${rgba(fg, 0.05)}, 0 22px 45px -24px rgba(0,0,0,0.6), 0 3px 8px rgba(0,0,0,0.22)`,
	};
	const texture: CSSProperties = {
		backgroundImage: `radial-gradient(${rgba(fg, 0.05)} 0.5px, transparent 0.6px)`,
		backgroundSize: "7px 7px",
	};

	const zoneRing = (zone: PassZone) =>
		highlightedZone === zone
			? "outline outline-2 outline-offset-2 outline-cyan-400/60 rounded-lg transition-all"
			: "outline outline-2 outline-offset-2 outline-transparent rounded-lg transition-all";

	const microLabel = "text-[7.5px] font-semibold uppercase tracking-[0.14em]";

	if (showBack) {
		return (
			<div className="relative overflow-hidden rounded-[20px]" style={cardStyle}>
				<div className="pointer-events-none absolute inset-0" style={texture} />
				<div className="relative flex items-center justify-between px-5 pt-5">
					<span className="text-[12px] font-semibold tracking-tight">
						{organizationName || "Back"}
					</span>
					<button
						type="button"
						onClick={() => setShowBack(false)}
						className={`${microLabel} opacity-60 transition-opacity hover:opacity-100`}
					>
						Front ›
					</button>
				</div>
				<div className={`relative mx-4 mt-3 mb-4 px-1 ${zoneRing("back")}`}>
					{backFields.length === 0 && (
						<p className="text-[10px] opacity-50">No back-of-pass fields yet.</p>
					)}
					{backFields.map((f) => (
						<div
							key={f.key}
							className="mb-2.5 border-b pb-2.5 last:mb-0 last:border-0 last:pb-0"
							style={{ borderColor: rgba(fg, 0.08) }}
						>
							<p className={microLabel} style={{ color: label }}>
								{f.label}
							</p>
							<p
								className="mt-1 whitespace-pre-wrap break-words text-[10.5px] leading-snug"
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
		<div className="relative overflow-hidden rounded-[20px]" style={cardStyle}>
			<div className="pointer-events-none absolute inset-0" style={texture} />

			{/* Header — logo chip (left) + header fields (right); stays visible when collapsed */}
			<div className={`relative flex items-center justify-between px-5 pt-5 ${zoneRing("header")}`}>
				{logoUrl ? (
					<img src={logoUrl} alt="Logo" className="h-[26px] w-auto max-w-[110px] object-contain" />
				) : (
					<div
						className="flex h-[26px] w-[26px] items-center justify-center rounded-[8px] text-[11px] font-bold"
						style={{
							backgroundColor: rgba(label, 0.18),
							color: label,
							boxShadow: `inset 0 0 0 1px ${rgba(label, 0.28)}`,
						}}
					>
						{(organizationName || "W").charAt(0).toUpperCase()}
					</div>
				)}
				<div className="flex items-start gap-3">
					{headerFields.slice(0, 3).map((f) => (
						<div key={f.key} className="text-right">
							<p className={microLabel} style={{ color: label, opacity: 0.85 }}>
								{f.label}
							</p>
							<p className="text-[10px] font-semibold" style={{ color: fg }}>
								{f.value || "—"}
							</p>
						</div>
					))}
				</div>
			</div>

			{stripMode ? (
				<div className="relative mx-4 mt-3 h-[92px] overflow-hidden rounded-xl">
					<img src={stripUrl} alt="Strip" className="h-full w-full object-cover" />
					<div
						className={`absolute inset-0 flex items-end px-3 py-2 ${zoneRing("primary")}`}
						style={{
							background: "linear-gradient(to top, rgba(0,0,0,0.55), transparent 60%)",
						}}
					>
						{primaryFields[0] && (
							<div className="min-w-0 flex-1">
								<p
									className={microLabel}
									style={{ color: "#fff", textShadow: "0 1px 2px rgba(0,0,0,0.7)" }}
								>
									{primaryFields[0].label}
								</p>
								<p
									className="text-[17px] font-bold leading-tight tracking-tight"
									style={{ color: "#fff", textShadow: "0 1px 4px rgba(0,0,0,0.8)" }}
								>
									{primaryFields[0].value || "—"}
								</p>
							</div>
						)}
					</div>
				</div>
			) : (
				<div className="relative flex items-start justify-between px-5 pt-4">
					<div className={`min-w-0 flex-1 pr-3 ${zoneRing("primary")}`}>
						{organizationName && (
							<p className={`${microLabel} mb-1`} style={{ color: label }}>
								{organizationName}
							</p>
						)}
						{primaryFields[0] ? (
							<p
								className="text-[19px] font-bold leading-[1.1] tracking-tight"
								style={{ color: fg }}
							>
								{primaryFields[0].value || "Your Name"}
							</p>
						) : (
							<p
								className="text-[19px] font-bold leading-[1.1] tracking-tight"
								style={{ color: fg }}
							>
								Your Name
							</p>
						)}
						{/* role / email etc. stacked under the name, business-card style */}
						{auxiliaryFields.length > 0 && (
							<div className={`mt-2 space-y-1 ${zoneRing("auxiliary")}`}>
								{auxiliaryFields.map((f) => (
									<div key={f.key}>
										<p className={microLabel} style={{ color: label, opacity: 0.9 }}>
											{f.label}
										</p>
										<p
											className="truncate text-[11px] font-medium"
											style={{ color: fg, opacity: 0.92 }}
											title={f.value}
										>
											{f.value || "—"}
										</p>
									</div>
								))}
							</div>
						)}
					</div>
					<div className="flex-shrink-0">
						{thumb ? (
							<img
								src={thumb}
								alt="Thumbnail"
								className="h-[64px] w-[64px] rounded-2xl object-cover"
								style={{
									boxShadow: `0 4px 12px rgba(0,0,0,0.3), inset 0 0 0 1px ${rgba(fg, 0.12)}`,
								}}
							/>
						) : (
							<div
								className="flex h-[64px] w-[64px] items-center justify-center rounded-2xl text-[9px] font-medium"
								style={{
									backgroundColor: rgba(fg, 0.06),
									color: rgba(fg, 0.35),
									boxShadow: `inset 0 0 0 1px ${rgba(fg, 0.14)}`,
								}}
							>
								Photo
							</div>
						)}
					</div>
				</div>
			)}

			{/* Secondary fields — PHONE / INTERNET style row */}
			{secondaryFields.length > 0 && (
				<div
					className={`relative mt-3 grid gap-x-4 gap-y-2.5 px-5 ${zoneRing("secondary")} ${
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
							<p className={microLabel} style={{ color: label }}>
								{field.label}
							</p>
							<p
								className="mt-0.5 truncate text-[11.5px] font-medium"
								style={{ color: fg }}
								title={field.value}
							>
								{field.value || "—"}
							</p>
						</div>
					))}
				</div>
			)}

			{/* Barcode — Wallet renders QR on a white tile; preview mirrors it */}
			{showQrCode && (
				<div className="relative mt-4 flex flex-col items-center px-5 pb-5">
					<div
						className="rounded-2xl bg-white p-3"
						style={{
							boxShadow: "0 6px 18px -6px rgba(0,0,0,0.4), inset 0 0 0 1px rgba(0,0,0,0.06)",
						}}
					>
						{qrDataUrl ? (
							<img src={qrDataUrl} alt="QR Code" className="h-[104px] w-[104px]" />
						) : (
							<div className="grid h-[104px] w-[104px] grid-cols-8 grid-rows-8 gap-[1px]">
								{Array.from({ length: 64 }).map((_, i) => (
									<div
										key={i}
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
					<p
						className="mt-2.5 text-[8.5px] font-medium tracking-wide"
						style={{ color: rgba(fg, 0.5) }}
					>
						Scan to view profile
					</p>
				</div>
			)}

			{!showQrCode && <div className="pb-5" />}

			{backFields.length > 0 && (
				<button
					type="button"
					onClick={() => setShowBack(true)}
					className={`absolute right-3 top-3 rounded px-1.5 py-0.5 ${microLabel} opacity-50 transition-opacity hover:opacity-100`}
					style={{ color: fg }}
				>
					Back ›
				</button>
			)}
		</div>
	);
}

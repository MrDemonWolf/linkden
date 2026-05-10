"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Cropper, { type Area } from "react-easy-crop";
import { RotateCw, ZoomIn, ZoomOut, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogDescription,
	DialogFooter,
} from "@/components/ui/dialog";
import type { CropPreset } from "@/lib/image-crop-presets";

interface ImageCropDialogProps {
	open: boolean;
	source: string | null;
	preset: CropPreset;
	fileName?: string;
	onCancel: () => void;
	onConfirm: (file: File) => void;
}

async function loadImage(src: string): Promise<HTMLImageElement> {
	return new Promise((resolve, reject) => {
		const img = new Image();
		img.crossOrigin = "anonymous";
		img.onload = () => resolve(img);
		img.onerror = () => reject(new Error("Failed to load image"));
		img.src = src;
	});
}

async function renderCrop(
	source: string,
	area: Area,
	rotation: number,
	preset: CropPreset,
): Promise<Blob> {
	const img = await loadImage(source);

	const rad = (rotation * Math.PI) / 180;
	const sin = Math.abs(Math.sin(rad));
	const cos = Math.abs(Math.cos(rad));
	const rotW = img.width * cos + img.height * sin;
	const rotH = img.width * sin + img.height * cos;

	const rotCanvas = document.createElement("canvas");
	rotCanvas.width = rotW;
	rotCanvas.height = rotH;
	const rctx = rotCanvas.getContext("2d");
	if (!rctx) throw new Error("Canvas context unavailable");
	rctx.translate(rotW / 2, rotH / 2);
	rctx.rotate(rad);
	rctx.drawImage(img, -img.width / 2, -img.height / 2);

	let outW = area.width;
	let outH = area.height;
	if (preset.aspect) {
		const longest = Math.max(outW, outH);
		const scale = preset.maxSize / longest;
		if (scale < 1) {
			outW = Math.round(outW * scale);
			outH = Math.round(outH * scale);
		}
	} else {
		const longest = Math.max(outW, outH);
		if (longest > preset.maxSize) {
			const scale = preset.maxSize / longest;
			outW = Math.round(outW * scale);
			outH = Math.round(outH * scale);
		}
	}

	const out = document.createElement("canvas");
	out.width = Math.max(1, Math.round(outW));
	out.height = Math.max(1, Math.round(outH));
	const octx = out.getContext("2d");
	if (!octx) throw new Error("Canvas context unavailable");
	octx.imageSmoothingEnabled = true;
	octx.imageSmoothingQuality = "high";
	octx.drawImage(
		rotCanvas,
		area.x,
		area.y,
		area.width,
		area.height,
		0,
		0,
		out.width,
		out.height,
	);

	const mime = preset.format === "webp" ? "image/webp" : "image/png";
	const quality = preset.format === "webp" ? 0.92 : undefined;

	return new Promise((resolve, reject) => {
		out.toBlob(
			(blob) => {
				if (!blob) reject(new Error("Canvas export failed"));
				else resolve(blob);
			},
			mime,
			quality,
		);
	});
}

export function ImageCropDialog({
	open,
	source,
	preset,
	fileName,
	onCancel,
	onConfirm,
}: ImageCropDialogProps) {
	const [crop, setCrop] = useState({ x: 0, y: 0 });
	const [zoom, setZoom] = useState(1);
	const [rotation, setRotation] = useState(0);
	const [exporting, setExporting] = useState(false);
	const areaRef = useRef<Area | null>(null);

	useEffect(() => {
		if (open) {
			setCrop({ x: 0, y: 0 });
			setZoom(1);
			setRotation(0);
			areaRef.current = null;
		}
	}, [open, source]);

	const onCropComplete = useCallback((_: Area, areaPixels: Area) => {
		areaRef.current = areaPixels;
	}, []);

	const handleConfirm = useCallback(async () => {
		if (!source || !areaRef.current) return;
		setExporting(true);
		try {
			const blob = await renderCrop(source, areaRef.current, rotation, preset);
			const ext = preset.format === "webp" ? "webp" : "png";
			const baseName = (fileName ?? "image").replace(/\.\w+$/, "");
			const file = new File([blob], `${baseName}.${ext}`, { type: blob.type });
			onConfirm(file);
		} finally {
			setExporting(false);
		}
	}, [source, rotation, preset, fileName, onConfirm]);

	const handleKey = useCallback(
		(e: KeyboardEvent) => {
			if (!open) return;
			if (e.key === "Enter" && !exporting) handleConfirm();
		},
		[open, exporting, handleConfirm],
	);

	useEffect(() => {
		window.addEventListener("keydown", handleKey);
		return () => window.removeEventListener("keydown", handleKey);
	}, [handleKey]);

	const aspectLabel = useMemo(() => {
		if (!preset.aspect) return "Free aspect";
		const ratio = preset.aspect;
		if (Math.abs(ratio - 1) < 0.01) return "1 : 1";
		if (Math.abs(ratio - 16 / 9) < 0.01) return "16 : 9";
		if (Math.abs(ratio - 1.91) < 0.01) return "1.91 : 1";
		return `${ratio.toFixed(2)} : 1`;
	}, [preset.aspect]);

	return (
		<Dialog open={open} onOpenChange={(v) => !v && !exporting && onCancel()}>
			<DialogContent className="max-w-3xl gap-0 overflow-hidden border-border/60 bg-background p-0">
				<DialogHeader className="border-b border-border/60 px-6 py-4">
					<DialogTitle className="text-base font-semibold tracking-tight">
						Adjust image
					</DialogTitle>
					<DialogDescription className="text-xs text-muted-foreground">
						Drag to reposition · pinch or scroll to zoom · output{" "}
						<span className="font-mono text-[10.5px]">{preset.dimensions}</span> · {aspectLabel}
					</DialogDescription>
				</DialogHeader>

				<div className="relative h-[420px] w-full bg-[linear-gradient(45deg,rgba(255,255,255,0.02)_25%,transparent_25%),linear-gradient(-45deg,rgba(255,255,255,0.02)_25%,transparent_25%),linear-gradient(45deg,transparent_75%,rgba(255,255,255,0.02)_75%),linear-gradient(-45deg,transparent_75%,rgba(255,255,255,0.02)_75%)] bg-[length:18px_18px] bg-[position:0_0,0_9px,9px_-9px,-9px_0] bg-black">
					{source && (
						<Cropper
							image={source}
							crop={crop}
							zoom={zoom}
							rotation={rotation}
							aspect={preset.aspect}
							onCropChange={setCrop}
							onZoomChange={setZoom}
							onRotationChange={setRotation}
							onCropComplete={onCropComplete}
							restrictPosition
							objectFit="contain"
							showGrid
							style={{
								containerStyle: { background: "transparent" },
							}}
						/>
					)}

					<div className="pointer-events-none absolute inset-3 border border-white/10" />
					<div className="pointer-events-none absolute left-3 top-3 h-3 w-3 border-l border-t border-white/40" />
					<div className="pointer-events-none absolute right-3 top-3 h-3 w-3 border-r border-t border-white/40" />
					<div className="pointer-events-none absolute bottom-3 left-3 h-3 w-3 border-b border-l border-white/40" />
					<div className="pointer-events-none absolute bottom-3 right-3 h-3 w-3 border-b border-r border-white/40" />
				</div>

				<div className="flex items-center gap-3 border-t border-border/60 bg-card/40 px-6 py-3">
					<ZoomOut className="h-3.5 w-3.5 text-muted-foreground" />
					<input
						type="range"
						min={1}
						max={4}
						step={0.01}
						value={zoom}
						onChange={(e) => setZoom(Number(e.target.value))}
						className="h-1 flex-1 cursor-pointer appearance-none rounded-full bg-muted accent-primary"
						aria-label="Zoom"
					/>
					<ZoomIn className="h-3.5 w-3.5 text-muted-foreground" />

					<div className="mx-2 h-5 w-px bg-border" />

					<Button
						type="button"
						variant="ghost"
						size="sm"
						onClick={() => setRotation((r) => (r + 90) % 360)}
						className="gap-1.5"
					>
						<RotateCw className="h-3.5 w-3.5" />
						<span className="font-mono text-[10.5px] tabular-nums">{rotation}°</span>
					</Button>

					<div className="ml-auto font-mono text-[10.5px] uppercase tracking-wider text-muted-foreground">
						{aspectLabel}
					</div>
				</div>

				<DialogFooter className="border-t border-border/60 px-6 py-3">
					<Button type="button" variant="ghost" size="sm" onClick={onCancel} disabled={exporting}>
						<X className="mr-1.5 h-3.5 w-3.5" />
						Cancel
					</Button>
					<Button type="button" size="sm" onClick={handleConfirm} disabled={!source || exporting}>
						<Check className="mr-1.5 h-3.5 w-3.5" />
						{exporting ? "Processing…" : "Crop & upload"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}

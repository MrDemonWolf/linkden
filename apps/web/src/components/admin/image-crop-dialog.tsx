"use client";

import { Check, RotateCw, X, ZoomIn, ZoomOut } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Cropper, { type Area } from "react-easy-crop";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
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

// Same cap the upload endpoint enforces (and ImageUploadField checks up front).
const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

function canvasToBlob(canvas: HTMLCanvasElement, mime: string, quality?: number): Promise<Blob> {
	return new Promise((resolve, reject) => {
		canvas.toBlob(
			(blob) => (blob ? resolve(blob) : reject(new Error("Canvas export failed"))),
			mime,
			quality,
		);
	});
}

/**
 * Encode the crop in the preset's format. A browser that can't encode WebP
 * from a canvas (Safari/WebKit, so every iOS browser) silently hands back PNG;
 * the WebP presets are photos, so that falls back to JPEG, which keeps big
 * crops under the upload cap.
 */
export async function encodeCrop(
	canvas: HTMLCanvasElement,
	format: CropPreset["format"],
): Promise<Blob> {
	if (format === "jpeg") return canvasToBlob(canvas, "image/jpeg", 0.85);
	if (format !== "webp") return canvasToBlob(canvas, "image/png");
	const webp = await canvasToBlob(canvas, "image/webp", 0.92);
	return webp.type === "image/webp" ? webp : canvasToBlob(canvas, "image/jpeg", 0.9);
}

/**
 * Name the file after the bytes actually encoded, never the requested format:
 * the server checks that extension, MIME and magic bytes agree.
 */
export function croppedFile(blob: Blob, fileName?: string): File {
	const ext = blob.type === "image/webp" ? "webp" : blob.type === "image/jpeg" ? "jpg" : "png";
	const baseName = (fileName ?? "image").replace(/\.\w+$/, "");
	return new File([blob], `${baseName}.${ext}`, { type: blob.type || "image/png" });
}

async function renderCrop(
	source: string,
	area: Area,
	rotation: number,
	preset: CropPreset,
): Promise<Blob> {
	const img = await loadImage(source);
	const imgW = img.naturalWidth || img.width;
	const imgH = img.naturalHeight || img.height;

	// react-easy-crop reports the crop area inside the rotated image's bounding box.
	const rad = (rotation * Math.PI) / 180;
	const sin = Math.abs(Math.sin(rad));
	const cos = Math.abs(Math.cos(rad));
	const rotW = imgW * cos + imgH * sin;
	const rotH = imgW * sin + imgH * cos;

	let outW = area.width;
	let outH = area.height;
	const longest = Math.max(outW, outH);
	if (longest > preset.maxSize) {
		const scale = preset.maxSize / longest;
		outW = Math.round(outW * scale);
		outH = Math.round(outH * scale);
	}

	const out = document.createElement("canvas");
	out.width = Math.max(1, Math.round(outW));
	out.height = Math.max(1, Math.round(outH));
	const octx = out.getContext("2d");
	if (!octx) throw new Error("Canvas context unavailable");
	octx.imageSmoothingEnabled = true;
	octx.imageSmoothingQuality = "high";
	// JPEG has no alpha: transparent pixels would encode black, so paint white first.
	if (preset.format === "jpeg") {
		octx.fillStyle = "#ffffff";
		octx.fillRect(0, 0, out.width, out.height);
	}
	// Draw the source once, straight into the output canvas (crop → rotate →
	// scale as one transform). Only output pixels are ever allocated — a
	// full-resolution rotated copy of a 24MP photo is past iOS Safari's canvas
	// area limit, and the export would fail.
	octx.scale(out.width / area.width, out.height / area.height);
	octx.translate(rotW / 2 - area.x, rotH / 2 - area.y);
	octx.rotate(rad);
	octx.drawImage(img, -imgW / 2, -imgH / 2);

	return encodeCrop(out, preset.format);
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
	// Synchronous guard: a double activation would otherwise start two exports
	// (and two uploads) before `exporting` re-renders.
	const exportingRef = useRef(false);
	const areaRef = useRef<Area | null>(null);

	// biome-ignore lint/correctness/useExhaustiveDependencies: source intentionally re-triggers the reset when a new image is loaded while the dialog stays open
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

	// No window-level Enter shortcut: Enter on the rotate, Cancel or close
	// button must do what that button says, not export the crop.
	const handleConfirm = useCallback(async () => {
		if (!source || !areaRef.current || exportingRef.current) return;
		exportingRef.current = true;
		setExporting(true);
		try {
			const blob = await renderCrop(source, areaRef.current, rotation, preset);
			if (blob.size > MAX_UPLOAD_BYTES) {
				toast.error("The cropped image is over 5MB — try a smaller crop");
				return;
			}
			onConfirm(croppedFile(blob, fileName));
		} catch {
			toast.error("Couldn't process this image — try a smaller one");
		} finally {
			exportingRef.current = false;
			setExporting(false);
		}
	}, [source, rotation, preset, fileName, onConfirm]);

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
					<DialogTitle className="text-base font-semibold tracking-tight">Adjust image</DialogTitle>
					<DialogDescription className="text-xs text-muted-foreground">
						Drag to reposition · pinch or scroll to zoom · output{" "}
						<span className="font-mono text-micro">{preset.dimensions}</span> · {aspectLabel}
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
							// No onRotationChange: react-easy-crop would then turn a two-finger
							// pinch-zoom into a few degrees of tilt. Rotation is the 90° button.
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
						aria-label={`Rotate 90° (currently ${rotation}°)`}
					>
						<RotateCw className="h-3.5 w-3.5" />
						<span aria-hidden className="font-mono text-micro tabular-nums">
							{rotation}°
						</span>
					</Button>

					<div className="ml-auto font-mono text-micro uppercase tracking-wider text-muted-foreground">
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

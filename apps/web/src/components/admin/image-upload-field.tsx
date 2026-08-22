"use client";

import { Crop, Image as ImageIcon, Upload, X } from "lucide-react";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { CROP_PRESETS, type ImagePurpose } from "@/lib/image-crop-presets";
import { cn } from "@/lib/utils";
import { ImageCropDialog } from "./image-crop-dialog";

interface ImageUploadFieldProps {
	label?: string;
	value: string;
	purpose: ImagePurpose;
	onUploadComplete: (url: string) => void;
	aspectRatio?: "square" | "banner" | "logo";
	hint?: string;
}

export function ImageUploadField({
	label,
	value,
	purpose,
	onUploadComplete,
	aspectRatio = "square",
	hint,
}: ImageUploadFieldProps) {
	const [preview, setPreview] = useState<string | null>(null);
	const [uploading, setUploading] = useState(false);
	const [dragActive, setDragActive] = useState(false);
	const [cropOpen, setCropOpen] = useState(false);
	const [cropSource, setCropSource] = useState<string | null>(null);
	const [cropFileName, setCropFileName] = useState<string | undefined>(undefined);
	const inputRef = useRef<HTMLInputElement>(null);
	const objectUrlRef = useRef<string | null>(null);
	const inputId = useId();

	const preset = CROP_PRESETS[purpose];

	useEffect(() => {
		return () => {
			if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
		};
	}, []);

	const upload = useCallback(
		async (file: File) => {
			const localUrl = URL.createObjectURL(file);
			setPreview(localUrl);
			setUploading(true);
			try {
				const formData = new FormData();
				formData.append("file", file);
				formData.append("purpose", purpose);
				// Let the server delete the object this upload replaces.
				if (value) formData.append("replaces", value);

				const serverUrl = process.env.NEXT_PUBLIC_SERVER_URL || "";
				const res = await fetch(`${serverUrl}/api/upload`, {
					method: "POST",
					body: formData,
					credentials: "include",
				});

				if (!res.ok) throw new Error("Upload failed");

				const data = (await res.json()) as { publicUrl: string };
				const fullUrl = data.publicUrl.startsWith("http")
					? data.publicUrl
					: `${serverUrl}${data.publicUrl}`;
				onUploadComplete(fullUrl);
				toast.success("Image uploaded");
			} catch {
				toast.error("Failed to upload image");
				setPreview(null);
			} finally {
				setUploading(false);
			}
		},
		[purpose, value, onUploadComplete],
	);

	const openCropper = useCallback((source: string, name?: string) => {
		if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
		objectUrlRef.current = source.startsWith("blob:") ? source : null;
		setCropSource(source);
		setCropFileName(name);
		setCropOpen(true);
	}, []);

	const handleFile = useCallback(
		(file: File) => {
			if (!file.type.startsWith("image/")) {
				toast.error("Please select an image file");
				return;
			}
			if (file.size > 5 * 1024 * 1024) {
				toast.error("File must be under 5MB");
				return;
			}
			const url = URL.createObjectURL(file);
			openCropper(url, file.name);
		},
		[openCropper],
	);

	const handleDrop = useCallback(
		(e: React.DragEvent) => {
			e.preventDefault();
			setDragActive(false);
			const file = e.dataTransfer.files[0];
			if (file) handleFile(file);
		},
		[handleFile],
	);

	const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (file) handleFile(file);
		if (inputRef.current) inputRef.current.value = "";
	};

	const handleRecrop = useCallback(async () => {
		const src = preview || value;
		if (!src) return;
		try {
			const res = await fetch(src, { credentials: "include" });
			const blob = await res.blob();
			const url = URL.createObjectURL(blob);
			openCropper(url, "image");
		} catch {
			toast.error("Could not load image for re-crop");
		}
	}, [preview, value, openCropper]);

	const displayUrl = preview || value;
	const isBanner = aspectRatio === "banner";
	const isLogo = aspectRatio === "logo";

	const zoneClass = isBanner
		? "h-28 w-full rounded-lg"
		: isLogo
			? "h-28 w-28 rounded-lg"
			: "h-24 w-24 rounded-full";

	const imgClass = isBanner || isLogo ? "h-full w-full rounded-lg" : "h-full w-full rounded-full";

	return (
		<>
			<div className={cn("space-y-1.5", !isBanner && "flex flex-col items-center")}>
				{label && (
					<label htmlFor={inputId} className="flex items-center gap-2 text-sm font-medium">
						{label}
						{hint && (
							<span className="font-mono text-micro uppercase tracking-wider text-muted-foreground/70">
								{hint}
							</span>
						)}
					</label>
				)}
				<button
					type="button"
					onDragOver={(e) => {
						e.preventDefault();
						setDragActive(true);
					}}
					onDragLeave={() => setDragActive(false)}
					onDrop={handleDrop}
					className={cn(
						"relative flex items-center justify-center border-2 border-dashed transition-all cursor-pointer",
						zoneClass,
						dragActive
							? "scale-[1.01] border-solid border-primary bg-primary/5"
							: "border-muted-foreground/25 hover:border-muted-foreground/50",
					)}
					onClick={() => inputRef.current?.click()}
				>
					{displayUrl ? (
						<>
							<img
								src={displayUrl}
								alt={label || "Upload"}
								className={cn("object-cover", imgClass)}
							/>
							{uploading && (
								<div className="absolute inset-0 flex items-center justify-center rounded-inherit bg-black/40">
									<div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
								</div>
							)}
						</>
					) : (
						<div className="flex flex-col items-center gap-1 text-muted-foreground">
							{uploading ? (
								<div className="h-5 w-5 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
							) : (
								<>
									<ImageIcon className="h-5 w-5" />
									<span className="text-micro">
										{isBanner ? "Drop banner image" : isLogo ? "Drop logo" : "Upload"}
									</span>
								</>
							)}
						</div>
					)}
				</button>

				<input
					id={inputId}
					ref={inputRef}
					type="file"
					accept="image/*"
					onChange={handleChange}
					className="hidden"
				/>

				{displayUrl && !uploading && (
					<div className="flex flex-wrap items-center justify-center gap-1">
						<Button
							type="button"
							variant="ghost"
							size="xs"
							onClick={(e) => {
								e.stopPropagation();
								inputRef.current?.click();
							}}
						>
							<Upload className="mr-1 h-3 w-3" />
							Replace
						</Button>
						<Button
							type="button"
							variant="ghost"
							size="xs"
							onClick={(e) => {
								e.stopPropagation();
								handleRecrop();
							}}
						>
							<Crop className="mr-1 h-3 w-3" />
							Re-crop
						</Button>
						<Button
							type="button"
							variant="ghost"
							size="xs"
							onClick={(e) => {
								e.stopPropagation();
								setPreview(null);
								onUploadComplete("");
							}}
						>
							<X className="mr-1 h-3 w-3" />
							Remove
						</Button>
					</div>
				)}
			</div>

			<ImageCropDialog
				open={cropOpen}
				source={cropSource}
				preset={preset}
				fileName={cropFileName}
				onCancel={() => {
					setCropOpen(false);
					if (objectUrlRef.current) {
						URL.revokeObjectURL(objectUrlRef.current);
						objectUrlRef.current = null;
					}
					setCropSource(null);
				}}
				onConfirm={(file) => {
					setCropOpen(false);
					if (objectUrlRef.current) {
						URL.revokeObjectURL(objectUrlRef.current);
						objectUrlRef.current = null;
					}
					setCropSource(null);
					upload(file);
				}}
			/>
		</>
	);
}

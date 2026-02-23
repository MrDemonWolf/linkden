"use client";

import { useState, useRef, useCallback } from "react";
import { Upload, X, Image as ImageIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ImageUploadFieldProps {
	label: string;
	value: string;
	purpose: "avatar" | "banner" | "og_image";
	onUploadComplete: (url: string) => void;
	aspectRatio?: "square" | "banner";
}

export function ImageUploadField({
	label,
	value,
	purpose,
	onUploadComplete,
	aspectRatio = "square",
}: ImageUploadFieldProps) {
	const [preview, setPreview] = useState<string | null>(null);
	const [uploading, setUploading] = useState(false);
	const [dragActive, setDragActive] = useState(false);
	const inputRef = useRef<HTMLInputElement>(null);

	const handleFile = useCallback(
		async (file: File) => {
			if (!file.type.startsWith("image/")) {
				toast.error("Please select an image file");
				return;
			}

			if (file.size > 5 * 1024 * 1024) {
				toast.error("File must be under 5MB");
				return;
			}

			// Show local preview immediately
			const localUrl = URL.createObjectURL(file);
			setPreview(localUrl);

			setUploading(true);
			try {
				const formData = new FormData();
				formData.append("file", file);
				formData.append("purpose", purpose);

				const serverUrl =
					process.env.NEXT_PUBLIC_SERVER_URL || "";
				const res = await fetch(`${serverUrl}/api/upload`, {
					method: "POST",
					body: formData,
					credentials: "include",
				});

				if (!res.ok) {
					throw new Error("Upload failed");
				}

				const data = await res.json() as { publicUrl: string };
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
		[purpose, onUploadComplete],
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

	const displayUrl = preview || value;
	const isBanner = aspectRatio === "banner";

	return (
		<div className="space-y-1.5">
			<label className="text-sm font-medium">{label}</label>
			<div
				onDragOver={(e) => {
					e.preventDefault();
					setDragActive(true);
				}}
				onDragLeave={() => setDragActive(false)}
				onDrop={handleDrop}
				className={cn(
					"relative flex items-center justify-center border-2 border-dashed transition-colors cursor-pointer",
					isBanner ? "h-28 w-full rounded-lg" : "h-24 w-24 rounded-full",
					dragActive
						? "border-primary bg-primary/5"
						: "border-muted-foreground/25 hover:border-muted-foreground/50",
				)}
				onClick={() => inputRef.current?.click()}
				onKeyDown={(e) => {
					if (e.key === "Enter" || e.key === " ") inputRef.current?.click();
				}}
				role="button"
				tabIndex={0}
			>
				{displayUrl ? (
					<>
						<img
							src={displayUrl}
							alt={label}
							className={cn(
								"object-cover",
								isBanner ? "h-full w-full rounded-lg" : "h-full w-full rounded-full",
							)}
						/>
						{uploading && (
							<div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-inherit">
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
								<span className="text-[10px]">
									{isBanner ? "Drop banner image" : "Upload"}
								</span>
							</>
						)}
					</div>
				)}

				<input
					ref={inputRef}
					type="file"
					accept="image/*"
					onChange={handleChange}
					className="hidden"
				/>
			</div>

			{displayUrl && !uploading && (
				<div className="flex items-center gap-1">
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
	);
}

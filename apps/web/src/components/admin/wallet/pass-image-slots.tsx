"use client";

import { ImageUploadField } from "@/components/admin/image-upload-field";

interface Props {
	logoUrl: string;
	iconUrl: string;
	thumbnailUrl: string;
	stripUrl: string;
	onChange: (key: "logoUrl" | "iconUrl" | "thumbnailUrl" | "stripUrl", url: string) => void;
}

export function PassImageSlots({ logoUrl, iconUrl, thumbnailUrl, stripUrl, onChange }: Props) {
	return (
		<div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
			<ImageUploadField
				label="Logo"
				hint="160 × 50"
				value={logoUrl}
				purpose="wallet_logo"
				aspectRatio="logo"
				onUploadComplete={(url) => onChange("logoUrl", url)}
			/>
			<ImageUploadField
				label="Icon"
				hint="29 × 29"
				value={iconUrl}
				purpose="wallet_icon"
				aspectRatio="square"
				onUploadComplete={(url) => onChange("iconUrl", url)}
			/>
			<ImageUploadField
				label="Thumbnail"
				hint="90 × 90"
				value={thumbnailUrl}
				purpose="wallet_thumbnail"
				aspectRatio="square"
				onUploadComplete={(url) => onChange("thumbnailUrl", url)}
			/>
			<ImageUploadField
				label="Strip"
				hint="375 × 144"
				value={stripUrl}
				purpose="wallet_strip"
				aspectRatio="banner"
				onUploadComplete={(url) => onChange("stripUrl", url)}
			/>
		</div>
	);
}

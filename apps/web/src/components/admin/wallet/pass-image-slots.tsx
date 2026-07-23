"use client";

import { ImageUploadField } from "@/components/admin/image-upload-field";

type SlotKey = "logoUrl" | "iconUrl" | "thumbnailUrl" | "stripUrl";

interface Props {
	logoUrl: string;
	iconUrl: string;
	thumbnailUrl: string;
	stripUrl: string;
	onChange: (key: SlotKey, url: string) => void;
	/** Which slots to render (default: all). Lets the strip live on its own tab. */
	slots?: SlotKey[];
}

const SLOT_DEFS = [
	{ key: "logoUrl", label: "Logo", hint: "160 × 50", purpose: "wallet_logo", aspectRatio: "logo" },
	{ key: "iconUrl", label: "Icon", hint: "29 × 29", purpose: "wallet_icon", aspectRatio: "square" },
	{
		key: "thumbnailUrl",
		label: "Thumbnail",
		hint: "90 × 90",
		purpose: "wallet_thumbnail",
		aspectRatio: "square",
	},
	{
		key: "stripUrl",
		label: "Strip",
		hint: "375 × 144",
		purpose: "wallet_strip",
		aspectRatio: "banner",
	},
] as const;

export function PassImageSlots({ slots, onChange, ...urls }: Props) {
	const defs = SLOT_DEFS.filter((d) => !slots || slots.includes(d.key));
	return (
		<div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
			{defs.map((d) => (
				<ImageUploadField
					key={d.key}
					label={d.label}
					hint={d.hint}
					value={urls[d.key]}
					purpose={d.purpose}
					aspectRatio={d.aspectRatio}
					onUploadComplete={(url) => onChange(d.key, url)}
				/>
			))}
		</div>
	);
}

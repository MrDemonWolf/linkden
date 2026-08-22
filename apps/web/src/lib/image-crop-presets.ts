export type ImagePurpose =
	| "avatar"
	| "banner"
	| "og_image"
	| "wallet_logo"
	| "wallet_icon"
	| "wallet_thumbnail"
	| "wallet_strip"
	| "logo"
	| "favicon"
	| "login_logo"
	| "login_background"
	| "block_thumbnail"
	| "block_image";

export interface CropPreset {
	aspect: number | undefined;
	maxSize: number;
	format: "png" | "webp";
	dimensions: string;
}

export const CROP_PRESETS: Record<ImagePurpose, CropPreset> = {
	avatar: { aspect: 1, maxSize: 512, format: "png", dimensions: "512 × 512" },
	favicon: { aspect: 1, maxSize: 256, format: "png", dimensions: "256 × 256" },
	wallet_logo: { aspect: 160 / 50, maxSize: 480, format: "png", dimensions: "480 × 150" },
	wallet_icon: { aspect: 1, maxSize: 87, format: "png", dimensions: "87 × 87" },
	wallet_thumbnail: { aspect: 1, maxSize: 270, format: "png", dimensions: "270 × 270" },
	wallet_strip: { aspect: 375 / 144, maxSize: 1125, format: "png", dimensions: "1125 × 432" },
	banner: { aspect: 16 / 9, maxSize: 1920, format: "webp", dimensions: "1920 × 1080" },
	og_image: { aspect: 1.91, maxSize: 1200, format: "png", dimensions: "1200 × 630" },
	logo: { aspect: undefined, maxSize: 1024, format: "png", dimensions: "≤ 1024" },
	login_logo: { aspect: undefined, maxSize: 512, format: "png", dimensions: "≤ 512" },
	login_background: { aspect: 16 / 9, maxSize: 2560, format: "webp", dimensions: "2560 × 1440" },
	block_thumbnail: { aspect: 1, maxSize: 256, format: "webp", dimensions: "256 × 256" },
	block_image: { aspect: undefined, maxSize: 1600, format: "webp", dimensions: "≤ 1600" },
};

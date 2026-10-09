import type { UploadPurpose } from "@linkden/validators/uploads";

/**
 * The server's upload purposes (`uploadPurposeEnum`), so `CROP_PRESETS` below
 * must stay exhaustive: a purpose added on one side only fails the build
 * instead of a runtime 400.
 */
export type ImagePurpose = UploadPurpose;

export interface CropPreset {
	aspect: number | undefined;
	maxSize: number;
	/**
	 * Encoded output. `jpeg` for photos (no alpha, a fraction of a PNG's
	 * weight, decodable by the OG renderer, unlike WebP); `png` where alpha or
	 * Apple's Wallet PNG requirement matters; `webp` for large backgrounds.
	 */
	format: "png" | "webp" | "jpeg";
	dimensions: string;
}

export const CROP_PRESETS: Record<ImagePurpose, CropPreset> = {
	// Shown at 96 px above the fold on every visit — a photo, so JPEG.
	avatar: { aspect: 1, maxSize: 512, format: "jpeg", dimensions: "512 × 512" },
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

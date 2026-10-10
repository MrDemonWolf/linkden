import { z } from "zod";

/** Largest image the upload endpoint accepts (the admin field checks it first). */
export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

export const uploadPurposeEnum = z.enum([
	"avatar",
	"banner",
	"og_image",
	"wallet_logo",
	"wallet_icon",
	"wallet_thumbnail",
	"wallet_strip",
	"logo",
	"favicon",
	"login_logo",
	"login_background",
	"block_thumbnail",
	"block_image",
]);

export type UploadPurpose = z.infer<typeof uploadPurposeEnum>;

export const UPLOAD_PURPOSES = uploadPurposeEnum.options;

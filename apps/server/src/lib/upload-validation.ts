export const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

export const ALLOWED_EXTENSIONS = new Set(["jpg", "jpeg", "png", "gif", "webp", "ico"]);

export const ALLOWED_MIME_TYPES = new Set([
	"image/jpeg",
	"image/png",
	"image/gif",
	"image/webp",
	"image/x-icon",
	"image/vnd.microsoft.icon",
]);

export const VALID_UPLOAD_PURPOSES = [
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
] as const;
export type UploadPurpose = (typeof VALID_UPLOAD_PURPOSES)[number];

export type UploadValidationError =
	| { ok: false; status: 400; error: string }
	| { ok: false; status: 413; error: string };

export type UploadValidationOk = {
	ok: true;
	ext: string;
	purpose: UploadPurpose;
};

export function validateUpload(args: {
	fileName: string;
	fileSize: number;
	mimeType: string;
	purpose: string | null;
}): UploadValidationOk | UploadValidationError {
	const { fileName, fileSize, mimeType, purpose } = args;

	if (fileSize > MAX_FILE_SIZE) {
		return { ok: false, status: 413, error: "File too large. Maximum size is 5MB." };
	}

	const ext = (fileName.split(".").pop() || "").toLowerCase();
	if (!ALLOWED_EXTENSIONS.has(ext)) {
		return {
			ok: false,
			status: 400,
			error: `File type not allowed. Allowed types: ${[...ALLOWED_EXTENSIONS].join(", ")}`,
		};
	}

	if (!ALLOWED_MIME_TYPES.has(mimeType)) {
		return { ok: false, status: 400, error: `MIME type not allowed: ${mimeType}` };
	}

	if (!purpose || !VALID_UPLOAD_PURPOSES.includes(purpose as UploadPurpose)) {
		return {
			ok: false,
			status: 400,
			error: `Invalid upload purpose. Allowed purposes: ${VALID_UPLOAD_PURPOSES.join(", ")}`,
		};
	}

	return { ok: true, ext, purpose: purpose as UploadPurpose };
}

export function buildR2Key(purpose: UploadPurpose, ext: string, uuid: string): string {
	return `${purpose}/${uuid}.${ext}`;
}

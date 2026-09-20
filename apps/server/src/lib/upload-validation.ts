import { UPLOAD_PURPOSES, type UploadPurpose, uploadPurposeEnum } from "@linkden/validators";

export type { UploadPurpose };
export { UPLOAD_PURPOSES, uploadPurposeEnum };

export const VALID_UPLOAD_PURPOSES = UPLOAD_PURPOSES;

export const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
// Reject the request before buffering the body if Content-Length already exceeds
// the file limit plus a small allowance for multipart framing.
export const MAX_UPLOAD_BODY_SIZE = MAX_FILE_SIZE + 16 * 1024;

export const ALLOWED_EXTENSIONS = new Set(["jpg", "jpeg", "png", "gif", "webp", "ico"]);

export const ALLOWED_MIME_TYPES = new Set([
	"image/jpeg",
	"image/png",
	"image/gif",
	"image/webp",
	"image/x-icon",
	"image/vnd.microsoft.icon",
]);

export function validateUploadContentLength(raw: string | null | undefined) {
	if (!raw) {
		return { ok: false as const, status: 411 as const, error: "Content-Length is required." };
	}
	if (!/^[1-9]\d*$/.test(raw)) {
		return { ok: false as const, status: 400 as const, error: "Invalid Content-Length." };
	}
	const length = Number(raw);
	if (!Number.isSafeInteger(length)) {
		return { ok: false as const, status: 400 as const, error: "Invalid Content-Length." };
	}
	if (length > MAX_UPLOAD_BODY_SIZE) {
		return {
			ok: false as const,
			status: 413 as const,
			error: "File too large. Maximum size is 5MB.",
		};
	}
	return { ok: true as const, length };
}

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
	purpose: unknown;
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

	const purposeResult = uploadPurposeEnum.safeParse(purpose);
	if (!purposeResult.success) {
		return {
			ok: false,
			status: 400,
			error: `Invalid upload purpose. Allowed purposes: ${UPLOAD_PURPOSES.join(", ")}`,
		};
	}

	return { ok: true, ext, purpose: purposeResult.data };
}

export function buildR2Key(purpose: UploadPurpose, ext: string, uuid: string): string {
	return `${purpose}/${uuid}.${ext}`;
}

const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function replacementKeyForPurpose(replaces: unknown, purpose: UploadPurpose): string | null {
	if (typeof replaces !== "string") return null;
	let url: URL;
	try {
		url = new URL(replaces, "https://linkden.invalid");
	} catch {
		return null;
	}
	if (url.search || url.hash) return null;

	const prefix = `/api/images/${purpose}/`;
	if (!url.pathname.startsWith(prefix)) return null;
	const filename = url.pathname.slice(prefix.length);
	const dot = filename.lastIndexOf(".");
	if (dot < 1 || filename.includes("/")) return null;
	const uuid = filename.slice(0, dot);
	const ext = filename.slice(dot + 1).toLowerCase();
	return UUID_V4.test(uuid) && ALLOWED_EXTENSIONS.has(ext) ? `${purpose}/${filename}` : null;
}

// Maps each allowed extension to the canonical signature its bytes must match.
const EXT_TO_SIGNATURE: Record<string, string> = {
	jpg: "jpg",
	jpeg: "jpg",
	png: "png",
	gif: "gif",
	webp: "webp",
	ico: "ico",
};

/**
 * Identify an image by its magic bytes (not by client-supplied name/MIME).
 * Returns a canonical type token or null if the header matches no known image.
 */
export function sniffImageSignature(bytes: Uint8Array): string | null {
	const b = bytes;
	if (
		b.length >= 8 &&
		b[0] === 0x89 &&
		b[1] === 0x50 &&
		b[2] === 0x4e &&
		b[3] === 0x47 &&
		b[4] === 0x0d &&
		b[5] === 0x0a &&
		b[6] === 0x1a &&
		b[7] === 0x0a
	)
		return "png";
	if (b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "jpg";
	if (
		b.length >= 6 &&
		b[0] === 0x47 &&
		b[1] === 0x49 &&
		b[2] === 0x46 &&
		b[3] === 0x38 &&
		(b[4] === 0x37 || b[4] === 0x39) &&
		b[5] === 0x61
	)
		return "gif";
	if (
		b.length >= 12 &&
		b[0] === 0x52 &&
		b[1] === 0x49 &&
		b[2] === 0x46 &&
		b[3] === 0x46 &&
		b[8] === 0x57 &&
		b[9] === 0x45 &&
		b[10] === 0x42 &&
		b[11] === 0x50
	)
		return "webp";
	if (b.length >= 4 && b[0] === 0x00 && b[1] === 0x00 && b[2] === 0x01 && b[3] === 0x00)
		return "ico";
	return null;
}

/** True when the file's magic bytes match the type claimed by its extension. */
export function signatureMatchesExt(ext: string, bytes: Uint8Array): boolean {
	const want = EXT_TO_SIGNATURE[ext];
	return !!want && sniffImageSignature(bytes) === want;
}

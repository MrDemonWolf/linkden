import { describe, expect, it } from "vitest";
import {
	buildR2Key,
	MAX_FILE_SIZE,
	signatureMatchesExt,
	sniffImageSignature,
	validateUpload,
	VALID_UPLOAD_PURPOSES,
} from "../lib/upload-validation";

const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]);
const JPG = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0, 0, 0, 0, 0]);
const GIF = new Uint8Array([0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 0, 0, 0, 0, 0, 0]);
const WEBP = new Uint8Array([0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50]);
const ICO = new Uint8Array([0x00, 0x00, 0x01, 0x00, 0, 0, 0, 0]);
// A GIF header renamed to .png / labelled image/png — the classic spoof.
const HTML = new Uint8Array([0x3c, 0x21, 0x44, 0x4f, 0x43, 0x54, 0x59, 0x50, 0x45, 0, 0, 0]);

describe("validateUpload", () => {
	const good = {
		fileName: "photo.png",
		fileSize: 1024,
		mimeType: "image/png",
		purpose: "avatar",
	};

	it("accepts a valid upload", () => {
		const r = validateUpload(good);
		expect(r.ok).toBe(true);
		if (r.ok) {
			expect(r.ext).toBe("png");
			expect(r.purpose).toBe("avatar");
		}
	});

	it("rejects oversize files with 413", () => {
		const r = validateUpload({ ...good, fileSize: MAX_FILE_SIZE + 1 });
		expect(r.ok).toBe(false);
		if (!r.ok) expect(r.status).toBe(413);
	});

	it("rejects disallowed extensions", () => {
		const r = validateUpload({ ...good, fileName: "doc.pdf" });
		expect(r.ok).toBe(false);
		if (!r.ok) expect(r.status).toBe(400);
	});

	it("rejects files with no extension", () => {
		const r = validateUpload({ ...good, fileName: "noext" });
		expect(r.ok).toBe(false);
	});

	it("rejects disallowed MIME types", () => {
		const r = validateUpload({ ...good, mimeType: "application/pdf" });
		expect(r.ok).toBe(false);
		if (!r.ok) expect(r.error).toContain("MIME type not allowed");
	});

	it("rejects null purpose", () => {
		const r = validateUpload({ ...good, purpose: null });
		expect(r.ok).toBe(false);
	});

	it("rejects unknown purpose", () => {
		const r = validateUpload({ ...good, purpose: "evil" });
		expect(r.ok).toBe(false);
	});

	it("normalizes mixed-case extension", () => {
		const r = validateUpload({ ...good, fileName: "PHOTO.PNG" });
		expect(r.ok).toBe(true);
		if (r.ok) expect(r.ext).toBe("png");
	});

	it.each(VALID_UPLOAD_PURPOSES)("accepts purpose %s", (purpose) => {
		const r = validateUpload({ ...good, purpose });
		expect(r.ok).toBe(true);
	});

	it.each([
		"image/jpeg",
		"image/png",
		"image/gif",
		"image/webp",
		"image/x-icon",
		"image/vnd.microsoft.icon",
	])("accepts MIME %s", (mimeType) => {
		const extByMime: Record<string, string> = {
			"image/jpeg": "jpg",
			"image/png": "png",
			"image/gif": "gif",
			"image/webp": "webp",
			"image/x-icon": "ico",
			"image/vnd.microsoft.icon": "ico",
		};
		const r = validateUpload({
			...good,
			mimeType,
			fileName: `f.${extByMime[mimeType]}`,
		});
		expect(r.ok).toBe(true);
	});
});

describe("sniffImageSignature", () => {
	it("identifies each supported image by magic bytes", () => {
		expect(sniffImageSignature(PNG)).toBe("png");
		expect(sniffImageSignature(JPG)).toBe("jpg");
		expect(sniffImageSignature(GIF)).toBe("gif");
		expect(sniffImageSignature(WEBP)).toBe("webp");
		expect(sniffImageSignature(ICO)).toBe("ico");
	});

	it("returns null for non-image content", () => {
		expect(sniffImageSignature(HTML)).toBeNull();
		expect(sniffImageSignature(new Uint8Array([1, 2]))).toBeNull();
	});
});

describe("signatureMatchesExt", () => {
	it("accepts bytes matching the claimed extension", () => {
		expect(signatureMatchesExt("png", PNG)).toBe(true);
		expect(signatureMatchesExt("jpg", JPG)).toBe(true);
		expect(signatureMatchesExt("jpeg", JPG)).toBe(true);
		expect(signatureMatchesExt("webp", WEBP)).toBe(true);
	});

	it("rejects a spoofed file (HTML bytes named .png)", () => {
		expect(signatureMatchesExt("png", HTML)).toBe(false);
	});

	it("rejects a real image whose bytes disagree with the extension", () => {
		expect(signatureMatchesExt("png", JPG)).toBe(false);
	});
});

describe("buildR2Key", () => {
	it("formats as purpose/uuid.ext", () => {
		expect(buildR2Key("avatar", "png", "abc-123")).toBe("avatar/abc-123.png");
	});

	it("preserves the extension verbatim", () => {
		expect(buildR2Key("banner", "webp", "u")).toBe("banner/u.webp");
	});
});

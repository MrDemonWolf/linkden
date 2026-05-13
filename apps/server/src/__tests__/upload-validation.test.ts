import { describe, expect, it } from "vitest";
import {
	buildR2Key,
	MAX_FILE_SIZE,
	validateUpload,
	VALID_UPLOAD_PURPOSES,
} from "../lib/upload-validation";

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

describe("buildR2Key", () => {
	it("formats as purpose/uuid.ext", () => {
		expect(buildR2Key("avatar", "png", "abc-123")).toBe("avatar/abc-123.png");
	});

	it("preserves the extension verbatim", () => {
		expect(buildR2Key("banner", "webp", "u")).toBe("banner/u.webp");
	});
});

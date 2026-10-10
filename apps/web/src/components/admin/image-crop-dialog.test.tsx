import { describe, expect, it, vi } from "vitest";
import { croppedFile, encodeCrop } from "./image-crop-dialog";

/** A canvas whose encoder only speaks the given types (WebKit can't encode WebP). */
function canvasEncoding(supported: string[]) {
	const canvas = document.createElement("canvas");
	const toBlob = vi.fn((cb: BlobCallback, type?: string) => {
		const out = type && supported.includes(type) ? type : "image/png";
		cb(new Blob(["x"], { type: out }));
	});
	canvas.toBlob = toBlob as HTMLCanvasElement["toBlob"];
	return { canvas, toBlob };
}

describe("crop export", () => {
	it("names the file after the bytes actually encoded", async () => {
		const { canvas } = canvasEncoding(["image/webp", "image/jpeg"]);
		const webp = croppedFile(await encodeCrop(canvas, "webp"), "photo.heic");
		expect([webp.name, webp.type]).toEqual(["photo.webp", "image/webp"]);

		const png = croppedFile(await encodeCrop(canvas, "png"), "avatar.jpg");
		expect([png.name, png.type]).toEqual(["avatar.png", "image/png"]);
	});

	it("falls back to JPEG when the browser can't encode WebP", async () => {
		const { canvas, toBlob } = canvasEncoding(["image/jpeg"]);
		const file = croppedFile(await encodeCrop(canvas, "webp"), "banner.png");
		// Not "banner.webp" with PNG bytes, which the server's signature check rejects.
		expect([file.name, file.type]).toEqual(["banner.jpg", "image/jpeg"]);
		expect(toBlob).toHaveBeenLastCalledWith(expect.any(Function), "image/jpeg", 0.9);
	});

	it("encodes the JPEG preset (avatar) as .jpg", async () => {
		const { canvas, toBlob } = canvasEncoding(["image/webp", "image/jpeg"]);
		const file = croppedFile(await encodeCrop(canvas, "jpeg"), "me.png");
		expect([file.name, file.type]).toEqual(["me.jpg", "image/jpeg"]);
		expect(toBlob).toHaveBeenLastCalledWith(expect.any(Function), "image/jpeg", 0.85);
	});
});

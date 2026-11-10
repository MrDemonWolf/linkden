// @vitest-environment node
import { createHash } from "node:crypto";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createPublicationSnapshot } from "../../../packages/validators/src/publication";
import { bundleReferencedPublicMedia, PUBLIC_MEDIA_LIMITS, type PublicMediaSource } from "../media";

const api = "https://api.example.test";
const origin = "https://profile.example.test";
const png = Uint8Array.from(
	Buffer.from(
		"iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
		"base64",
	),
);
const upload = (key: string) => `${api}/api/images/${key}`;
const image = (id: string, src: string, extra = {}) => ({
	id,
	type: "image",
	config: JSON.stringify({ src }),
	position: 0,
	isEnabled: true,
	status: "published",
	...extra,
});
function raw() {
	const profile: { name: string; image: string | null; bio: string | null; isVerified: boolean } = {
		name: "Fixture",
		image: upload("avatar/1.png"),
		bio: null,
		isVerified: false,
	};
	const blocks: Record<string, unknown>[] = [image("photo", upload("block_image/1.png"))];
	return {
		revision: "media-proof",
		publicOrigin: origin,
		builtAt: "2026-11-05T12:00:00.000Z",
		profile,
		settings: {} as Record<string, string>,
		blocks,
		socialNetworks: [],
	};
}
const response = () => new Response(png, { headers: { "content-type": "image/png" } });
const source = (
	read: PublicMediaSource["read"] = vi.fn(async () => response()),
): PublicMediaSource => ({
	origins: [api],
	read,
});
afterEach(() => {
	vi.useRealTimers();
	vi.unstubAllGlobals();
});

describe("referenced public media", () => {
	it("bundles approved image roles, rewrites links/configs and deduplicates bytes without changing the frozen input", async () => {
		const input = raw();
		input.settings = {
			avatar_url: upload("avatar/2.png"),
			banner_enabled: "true",
			banner_mode: "custom",
			banner_custom_url: upload("banner/1.png"),
			branding_logo_url: upload("logo/1.png"),
			branding_favicon_url: upload("favicon/1.png"),
			seo_og_mode: "custom",
			seo_og_image: upload("og_image/1.png"),
			vcard_enabled: "true",
		};
		input.blocks.push({
			id: "thumbnail",
			type: "link",
			url: upload("block_image/1.png"),
			config: JSON.stringify({ thumbnail: upload("block_thumbnail/1.png") }),
			position: 1,
			isEnabled: true,
			status: "published",
		});
		input.blocks.push({
			id: "card",
			type: "vcard",
			config: JSON.stringify({
				fullName: "Fixture",
				photo: upload("avatar/2.png"),
				urls: [{ label: "Artwork", url: upload("block_image/1.png") }],
			}),
			position: 2,
			isEnabled: true,
			status: "published",
		});
		const snapshot = createPublicationSnapshot(input);
		const original = structuredClone(snapshot);
		const read = vi.fn(async (_key: string) => response());
		const result = await bundleReferencedPublicMedia(snapshot, source(read));
		const digest = createHash("sha256").update(png).digest("hex");
		const href = `${origin}/assets/media-${digest}.png`;
		expect(snapshot).toEqual(original);
		expect(result.files.size).toBe(1);
		expect(result.bundled).toEqual([
			{
				path: `assets/media-${digest}.png`,
				sha256: digest,
				bytes: png.length,
				contentType: "image/png",
			},
		]);
		expect(result.snapshot.settings.avatar_url).toBe(href);
		expect(result.snapshot.blocks[1]?.url).toBe(href);
		expect(JSON.parse(result.snapshot.blocks[0]!.config).src).toBe(href);
		expect(JSON.parse(result.snapshot.blocks[2]!.config)).toMatchObject({
			photo: href,
			urls: [{ label: "Artwork", url: href }],
		});
		expect(read).toHaveBeenCalledTimes(7);
		expect(read.mock.calls.map(([key]) => key)).not.toContain("avatar/1.png");
		expect(result.dependencies).toEqual([]);
	});

	it("never reads hidden/future uploads, inactive banner media, or unused classic thumbnails", async () => {
		const input = raw();
		input.settings = {
			banner_enabled: "false",
			banner_mode: "custom",
			banner_custom_url: upload("banner/hidden.png"),
		};
		input.blocks.push(
			image("hidden", upload("block_image/hidden.png"), { isEnabled: false }),
			image("future", upload("block_image/future.png"), { scheduledStart: "2027-01-01T00:00:00Z" }),
		);
		input.blocks.push({
			id: "classic",
			type: "link",
			config: JSON.stringify({
				variant: "classic",
				thumbnail: upload("block_thumbnail/hidden.png"),
			}),
			position: 3,
			isEnabled: true,
			status: "published",
		});
		const read = vi.fn(async (_key: string) => response());
		await bundleReferencedPublicMedia(createPublicationSnapshot(input), source(read));
		expect(read.mock.calls.map(([key]) => key)).toEqual(["avatar/1.png", "block_image/1.png"]);
	});

	it("preserves external URLs without fetching and reports unresolved local uploads explicitly", async () => {
		const fetch = vi.fn();
		vi.stubGlobal("fetch", fetch);
		const input = raw();
		input.profile.image = "https://external.example.test/avatar.png";
		input.blocks = [image("photo", `${origin}/api/images/block_image/1.png`)];
		input.settings.custom_css = ".ld-page { color: blue; }";
		const result = await bundleReferencedPublicMedia(createPublicationSnapshot(input));
		expect(fetch).not.toHaveBeenCalled();
		expect(result.files.size).toBe(0);
		expect(result.snapshot.profile.image).toBe(input.profile.image);
		expect(result.dependencies).toEqual([
			{ url: input.profile.image, kind: "external" },
			{ url: `${origin}/api/images/block_image/1.png`, kind: "unresolved-upload" },
		]);
		expect(result.customCssReview).toBe(true);
	});

	it.each([
		"wallet_logo",
		"wallet_icon",
		"wallet_strip",
		"login_logo",
		"login_background",
		"private",
	])("rejects %s uploads before invoking the reader", async (purpose) => {
		const input = raw();
		input.profile.image = upload(`${purpose}/1.png`);
		const read = vi.fn(async () => response());
		await expect(
			bundleReferencedPublicMedia(createPublicationSnapshot(input), source(read)),
		).rejects.toThrow(/approved public upload/);
		expect(read).not.toHaveBeenCalled();
	});

	it.each([
		"avatar/1.png?token=hidden",
		"avatar/1.png#fragment",
		"avatar/%31.png",
		"avatar/../logo/1.png",
	])("rejects ambiguous upload reference %s without a read", async (key) => {
		const input = raw();
		input.profile.image = upload(key);
		const read = vi.fn(async () => response());
		await expect(
			bundleReferencedPublicMedia(createPublicationSnapshot(input), source(read)),
		).rejects.toThrow(/canonical/);
		expect(read).not.toHaveBeenCalled();
	});

	it("does not turn arbitrary API URLs into image-store reads", async () => {
		const input = raw();
		input.profile.image = `${api}/private/files/picture.png`;
		input.blocks = [];
		const read = vi.fn(async () => response());
		const result = await bundleReferencedPublicMedia(
			createPublicationSnapshot(input),
			source(read),
		);
		expect(read).not.toHaveBeenCalled();
		expect(result.dependencies).toEqual([{ url: input.profile.image, kind: "external" }]);
	});

	it("records unresolved site files and legacy HTTP dependencies without fetching either", async () => {
		const input = raw();
		input.profile.image = `${origin}/logo.svg`;
		input.blocks = [image("external", "http://legacy.example.test/photo.png")];
		const read = vi.fn(async () => response());
		const result = await bundleReferencedPublicMedia(
			createPublicationSnapshot(input),
			source(read),
		);
		expect(read).not.toHaveBeenCalled();
		expect(result.externalHttpReview).toBe(true);
		expect(result.dependencies).toEqual([
			{ url: "http://legacy.example.test/photo.png", kind: "external" },
			{ url: `${origin}/logo.svg`, kind: "local-non-upload" },
		]);
	});

	it.each([
		"http://internal.test",
		"file:///tmp/private",
		"https://api.example.test/path",
		"https://user:secret@api.example.test",
	])("rejects an unsafe reader origin", async (value) => {
		await expect(
			bundleReferencedPublicMedia(createPublicationSnapshot(raw()), {
				...source(),
				origins: [value],
			}),
		).rejects.toThrow(/origins/);
	});

	it.each(["text/html", "image/svg+xml", "image/jpeg", ""])(
		"rejects a forged or mismatched MIME type %s",
		async (mime) => {
			await expect(
				bundleReferencedPublicMedia(
					createPublicationSnapshot(raw()),
					source(vi.fn(async () => new Response(png, { headers: { "content-type": mime } }))),
				),
			).rejects.toThrow(/MIME/);
		},
	);

	it("rejects bytes spoofed as PNG", async () => {
		await expect(
			bundleReferencedPublicMedia(
				createPublicationSnapshot(raw()),
				source(
					vi.fn(
						async () =>
							new Response("<html>Private response</html>", {
								headers: { "content-type": "image/png" },
							}),
					),
				),
			),
		).rejects.toThrow(/signature/);
	});

	it("rejects a redirected or unexpected-origin response", async () => {
		const redirected = response();
		Object.defineProperty(redirected, "redirected", { value: true });
		await expect(
			bundleReferencedPublicMedia(
				createPublicationSnapshot(raw()),
				source(vi.fn(async () => redirected)),
			),
		).rejects.toThrow(/unredirected/);
		const foreign = response();
		Object.defineProperty(foreign, "url", { value: "https://foreign.test/private.png" });
		await expect(
			bundleReferencedPublicMedia(
				createPublicationSnapshot(raw()),
				source(vi.fn(async () => foreign)),
			),
		).rejects.toThrow(/unexpected URL/);
	});

	it("enforces both declared and streamed per-file size limits", async () => {
		await expect(
			bundleReferencedPublicMedia(
				createPublicationSnapshot(raw()),
				source(
					vi.fn(
						async () =>
							new Response(png, {
								headers: {
									"content-type": "image/png",
									"content-length": String(PUBLIC_MEDIA_LIMITS.fileBytes + 1),
								},
							}),
					),
				),
			),
		).rejects.toThrow(/budget/);
		const huge = new Uint8Array(PUBLIC_MEDIA_LIMITS.fileBytes + 1);
		huge.set(png);
		await expect(
			bundleReferencedPublicMedia(
				createPublicationSnapshot(raw()),
				source(vi.fn(async () => new Response(huge, { headers: { "content-type": "image/png" } }))),
			),
		).rejects.toThrow(/budget/);
	});

	it("bounds unique referenced reads before fetching", async () => {
		const input = raw();
		input.profile.image = null;
		input.blocks = Array.from({ length: PUBLIC_MEDIA_LIMITS.files + 1 }, (_, index) =>
			image(`image-${index}`, upload(`block_image/${index}.png`)),
		);
		const read = vi.fn(async () => response());
		await expect(
			bundleReferencedPublicMedia(createPublicationSnapshot(input), source(read)),
		).rejects.toThrow(/64-upload/);
		expect(read).not.toHaveBeenCalled();
	});

	it("bounds cumulative download bytes even when images have identical contents", async () => {
		const input = raw();
		input.profile.image = null;
		input.blocks = Array.from({ length: 6 }, (_, index) =>
			image(`image-${index}`, upload(`block_image/${index}.png`)),
		);
		const large = new Uint8Array(PUBLIC_MEDIA_LIMITS.fileBytes);
		large.set(png);
		await expect(
			bundleReferencedPublicMedia(
				createPublicationSnapshot(input),
				source(
					vi.fn(
						async () =>
							new Response(large, {
								headers: { "content-type": "image/png", "content-length": String(large.length) },
							}),
					),
				),
			),
		).rejects.toThrow(/budget/);
	});

	it("aborts an unresponsive reader and strips sensitive reader errors", async () => {
		vi.useFakeTimers();
		let signal: AbortSignal | undefined;
		const pending = bundleReferencedPublicMedia(createPublicationSnapshot(raw()), {
			origins: [api],
			read: async (_key, passedSignal) => {
				signal = passedSignal;
				return new Promise<Response>(() => {});
			},
		});
		const rejected = expect(pending).rejects.toThrow(/timed out/);
		await vi.advanceTimersByTimeAsync(PUBLIC_MEDIA_LIMITS.readTimeoutMs);
		await rejected;
		expect(signal?.aborted).toBe(true);
		vi.useRealTimers();
		await expect(
			bundleReferencedPublicMedia(
				createPublicationSnapshot(raw()),
				source(
					vi.fn(async () => {
						throw new Error("storage credential SECRET");
					}),
				),
			),
		).rejects.toThrow("Approved public media could not be read");
		await expect(
			bundleReferencedPublicMedia(
				createPublicationSnapshot(raw()),
				source(() => {
					throw new Error("synchronous storage credential SECRET");
				}),
			),
		).rejects.toThrow("Approved public media could not be read");
	});

	it("applies the same deadline while reading the response body and cancels it", async () => {
		vi.useFakeTimers();
		const cancel = vi.fn();
		const read = vi.fn(
			async () =>
				new Response(new ReadableStream({ cancel }), {
					headers: { "content-type": "image/png" },
				}),
		);
		const pending = bundleReferencedPublicMedia(createPublicationSnapshot(raw()), source(read));
		const rejected = expect(pending).rejects.toThrow(/timed out/);
		await vi.advanceTimersByTimeAsync(PUBLIC_MEDIA_LIMITS.readTimeoutMs);
		await rejected;
		expect(cancel).toHaveBeenCalledOnce();
	});

	it("cancels a late response when an injected reader ignores its abort signal", async () => {
		vi.useFakeTimers();
		const cancel = vi.fn();
		const read = async () =>
			new Promise<Response>((resolve) => {
				setTimeout(
					() =>
						resolve(
							new Response(new ReadableStream({ cancel }), {
								headers: { "content-type": "image/png" },
							}),
						),
					PUBLIC_MEDIA_LIMITS.readTimeoutMs + 50,
				);
			});
		const pending = bundleReferencedPublicMedia(createPublicationSnapshot(raw()), source(read));
		const rejected = expect(pending).rejects.toThrow(/timed out/);
		await vi.advanceTimersByTimeAsync(PUBLIC_MEDIA_LIMITS.readTimeoutMs);
		await rejected;
		expect(cancel).not.toHaveBeenCalled();
		await vi.advanceTimersByTimeAsync(50);
		expect(cancel).toHaveBeenCalledOnce();
	});
});

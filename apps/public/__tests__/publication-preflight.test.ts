// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";
import { createPublicationSnapshot } from "../../../packages/validators/src/publication";
import { bundleReferencedPublicMedia } from "../media";
import { assertPublicationMediaReady } from "../publication-preflight";

const origin = "https://public.example.test";
const api = "https://admin.example.test";
const png = Uint8Array.from(
	Buffer.from(
		"iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
		"base64",
	),
);
const manifest = (urls: string[], pending: string[] = []) => ({
	pending,
	media: { dependencies: urls.map((url) => ({ url })) },
});
const snapshot = (image: string) =>
	createPublicationSnapshot({
		revision: "media-preflight",
		publicOrigin: origin,
		builtAt: "2026-11-06T12:00:00.000Z",
		profile: { name: "Fixture", image, bio: null, isVerified: false },
		settings: {},
		blocks: [],
		socialNetworks: [],
	});

afterEach(() => vi.unstubAllGlobals());

describe("CI publication media boundary", () => {
	it("rejects a forgotten API image origin after the actual media inventory, and accepts its approved bundle", async () => {
		const fetch = vi.fn();
		vi.stubGlobal("fetch", fetch);
		const frozen = snapshot(`${api}/api/images/avatar/fixture.png`);
		const original = structuredClone(frozen);
		const unconfigured = await bundleReferencedPublicMedia(frozen);
		expect(unconfigured.dependencies).toEqual([
			{ url: `${api}/api/images/avatar/fixture.png`, kind: "external" },
		]);
		expect(() => assertPublicationMediaReady(origin, { pending: [], media: unconfigured })).toThrow(
			/approved image origin/,
		);
		const read = vi.fn(async () => new Response(png, { headers: { "content-type": "image/png" } }));
		const bundled = await bundleReferencedPublicMedia(frozen, { origins: [api], read });
		expect(() =>
			assertPublicationMediaReady(origin, { pending: [], media: bundled }),
		).not.toThrow();
		expect(bundled.snapshot.profile.image).toMatch(
			/^https:\/\/public\.example\.test\/assets\/media-[a-f0-9]{64}\.png$/,
		);
		expect(read).toHaveBeenCalledTimes(1);
		expect(fetch).not.toHaveBeenCalled();
		expect(frozen).toEqual(original);
	});

	it.each([
		"http://external.example.test/image.png",
		"http://127.0.0.1:3004/logo.svg",
		"https://localhost/image.png",
		"https://preview.localhost/image.png",
		"https://localhost./image.png",
		"https://127.2.3.4/image.png",
		"https://2130706433/image.png",
		"https://[::1]/image.png",
		"https://[::ffff:127.0.0.1]/image.png",
		"https://0.0.0.0/image.png",
		"https://[::]/image.png",
	])("rejects retained insecure or loopback image %s without reading it", (url) => {
		const fetch = vi.fn();
		vi.stubGlobal("fetch", fetch);
		expect(() => assertPublicationMediaReady(origin, manifest([url]))).toThrow(/HTTP or loopback/);
		expect(fetch).not.toHaveBeenCalled();
	});

	it.each([
		"/api/images/avatar/missing.png",
		"/api/images",
		"/%61pi/images/avatar/missing.png",
		"/api%2fimages/avatar/missing.png",
		"/%2561pi/images/avatar/missing.png",
	])("rejects an unresolved upload route on an unapproved origin %s", (path) => {
		expect(() => assertPublicationMediaReady(origin, manifest([`${api}${path}`]))).toThrow(
			/approved image origin/,
		);
	});

	it.each([
		"referenced-media-bundle",
		"unresolved-local-media",
		"external-http-media-review",
		"custom-css-media-review",
	])("preserves existing unresolved media gate %s", (gate) => {
		expect(() => assertPublicationMediaReady(origin, manifest([], [gate]))).toThrow(
			/unresolved media or custom CSS/,
		);
	});

	it("retains ordinary HTTPS external images without fetching or falsely clearing cloud gates", async () => {
		const fetch = vi.fn();
		vi.stubGlobal("fetch", fetch);
		const media = await bundleReferencedPublicMedia(
			snapshot("https://images.example.test/photo.png"),
		);
		const pending = [
			"external-media-dependencies",
			"scheduled-publication",
			"staging-routing-proof",
		];
		expect(() => assertPublicationMediaReady(origin, { pending, media })).not.toThrow();
		expect(pending).toEqual([
			"external-media-dependencies",
			"scheduled-publication",
			"staging-routing-proof",
		]);
		expect(media.dependencies[0]?.url).toBe("https://images.example.test/photo.png");
		expect(fetch).not.toHaveBeenCalled();
	});

	it("keeps loopback media available for local fixtures without allowing it into an HTTPS release", async () => {
		const image = "http://127.0.0.1:3004/logo.svg";
		const media = await bundleReferencedPublicMedia(snapshot(image));
		expect(media.snapshot.profile.image).toBe(image);
		expect(media.externalHttpReview).toBe(false);
		expect(() => assertPublicationMediaReady(origin, { pending: [], media })).toThrow(/loopback/);
	});

	it.each(["http://public.example.test", "https://localhost", "https://[::1]"])(
		"requires an HTTPS public destination %s",
		(publicOrigin) => {
			expect(() => assertPublicationMediaReady(publicOrigin, manifest([]))).toThrow(
				/public HTTPS origin/,
			);
		},
	);
});

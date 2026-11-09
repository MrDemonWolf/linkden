import { createHash } from "node:crypto";
import type { PublicSnapshot } from "../../packages/validators/src/publication";
import { MAX_UPLOAD_BYTES } from "../../packages/validators/src/uploads";
// Pure validation only: this module has no server environment, DB or Worker imports.
import { isServableImageKey, signatureMatchesExt } from "../server/src/lib/upload-validation";

export const PUBLIC_MEDIA_LIMITS = {
	files: 64,
	fileBytes: MAX_UPLOAD_BYTES,
	totalBytes: 25 * 1024 * 1024,
	readTimeoutMs: 5_000,
} as const;

const PUBLIC_PURPOSES = new Set([
	"avatar",
	"banner",
	"logo",
	"favicon",
	"og_image",
	"block_image",
	"block_thumbnail",
]);
const MIME_TYPES: Record<string, readonly string[]> = {
	jpg: ["image/jpeg"],
	jpeg: ["image/jpeg"],
	png: ["image/png"],
	gif: ["image/gif"],
	webp: ["image/webp"],
	ico: ["image/x-icon", "image/vnd.microsoft.icon"],
};

/** Shared publisher/R2-reader gate. Preserve key case; never normalize or decode it. */
export function isPublicImageKey(key: string): boolean {
	return isServableImageKey(key) && PUBLIC_PURPOSES.has(key.split("/", 1)[0]!);
}

export interface PublicMediaSource {
	/** Explicit aliases for the same approved image store. Never inferred from media URLs. */
	origins: readonly string[];
	/** Read one validated public key. No cookies, credentials or source URL are passed. */
	read: (key: string, signal: AbortSignal) => Promise<Response>;
}

export class PublicMediaError extends Error {}

interface MediaReference {
	url: string;
	image: boolean;
	set: (url: string) => void;
}

export interface BundledPublicMedia {
	path: string;
	sha256: string;
	bytes: number;
	contentType: string;
}

type MediaDependency = {
	url: string;
	kind: "external" | "local-non-upload" | "unresolved-upload";
};

function sourceOrigin(value: string): string {
	let url: URL;
	try {
		url = new URL(value);
	} catch {
		throw new PublicMediaError("Media reader origin is invalid");
	}
	const local = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
	if (
		(url.protocol !== "https:" && !(url.protocol === "http:" && local)) ||
		url.username ||
		url.password ||
		url.pathname !== "/" ||
		url.search ||
		url.hash
	)
		throw new PublicMediaError("Media readers require explicit HTTPS or loopback HTTP origins");
	return url.origin;
}

/** Inventory URL fields only, never text/CSS, hidden blocks or the source bucket. */
function references(snapshot: PublicSnapshot) {
	const refs: MediaReference[] = [];
	const finish: (() => void)[] = [];
	const field = (object: Record<string, unknown>, key: string, image: boolean) => {
		const value = object[key];
		if (typeof value === "string" && value)
			refs.push({
				url: value,
				image,
				set: (url) => {
					object[key] = url;
				},
			});
	};
	if (!snapshot.settings.avatar_url) field(snapshot.profile, "image", true);
	for (const key of [
		"avatar_url",
		"banner_custom_url",
		"branding_logo_url",
		"branding_favicon_url",
		"seo_og_image",
	])
		field(snapshot.settings, key, true);
	for (const key of ["branding_link", "branding_pp_url", "branding_tos_url", "consent_privacy_url"])
		field(snapshot.settings, key, false);
	const card = (value: Record<string, unknown>) => {
		field(value, "photo", true);
		if (Array.isArray(value.urls)) for (const entry of value.urls) field(entry, "url", false);
	};
	for (const row of snapshot.blocks) {
		if (row.type === "link" || row.type === "image") field(row, "url", false);
		const config = JSON.parse(row.config) as Record<string, unknown>;
		if (row.type === "image") field(config, "src", true);
		if (row.type === "link" && config.variant !== "classic") field(config, "thumbnail", true);
		if (row.type === "location" && config.linkType === "custom")
			field(config, "customLinkUrl", false);
		if (row.type === "vcard") card(config);
		// Defer serialization until all setters have rewritten this config.
		finish.push(() => {
			row.config = JSON.stringify(config);
		});
	}
	// A visible vCard supplies the global download before the fallback setting.
	if (snapshot.settings.vcard_data && !snapshot.blocks.some((row) => row.type === "vcard")) {
		const config = JSON.parse(snapshot.settings.vcard_data) as Record<string, unknown>;
		card(config);
		finish.push(() => {
			snapshot.settings.vcard_data = JSON.stringify(config);
		});
	}
	for (const network of snapshot.socialNetworks) field(network, "url", false);
	return { refs, finish };
}

async function readUpload(source: PublicMediaSource, key: string, remainingBytes: number) {
	const controller = new AbortController();
	let reader: ReadableStreamDefaultReader<Uint8Array> | undefined;
	let body: ReadableStream<Uint8Array> | null = null;
	const timeout = new Promise<never>((_, reject) => {
		controller.signal.addEventListener(
			"abort",
			() => reject(new PublicMediaError("Public media read timed out")),
			{ once: true },
		);
	});
	const timer = setTimeout(() => controller.abort(), PUBLIC_MEDIA_LIMITS.readTimeoutMs);
	try {
		const response = await Promise.race([
			Promise.resolve()
				.then(() => source.read(key, controller.signal))
				.then((response) => {
					if (controller.signal.aborted) {
						void response.body?.cancel().catch(() => {});
						throw new PublicMediaError("Public media read timed out");
					}
					return response;
				}),
			timeout,
		]);
		body = response.body;
		if (response.status !== 200 || response.redirected || !response.body)
			throw new PublicMediaError("Public media reader must return an unredirected image response");
		if (response.url) {
			const url = new URL(response.url);
			if (
				!source.origins.some((origin) => sourceOrigin(origin) === url.origin) ||
				url.pathname !== `/api/images/${key}` ||
				url.search ||
				url.hash
			)
				throw new PublicMediaError("Public media reader returned an unexpected URL");
		}
		const ext = key.slice(key.lastIndexOf(".") + 1).toLowerCase();
		const contentType = (response.headers.get("content-type") ?? "")
			.split(";", 1)[0]!
			.trim()
			.toLowerCase();
		if (!MIME_TYPES[ext]?.includes(contentType))
			throw new PublicMediaError("Public media MIME type does not match the upload extension");
		const limit = Math.min(PUBLIC_MEDIA_LIMITS.fileBytes, remainingBytes);
		const length = response.headers.get("content-length");
		if (length !== null && (!/^[1-9]\d*$/.test(length) || Number(length) > limit))
			throw new PublicMediaError("Public media exceeds its declared byte budget");
		reader = response.body.getReader();
		const chunks: Uint8Array[] = [];
		let size = 0;
		for (;;) {
			const chunk = await Promise.race([reader.read(), timeout]);
			if (chunk.done) break;
			size += chunk.value.byteLength;
			if (size > limit) throw new PublicMediaError("Public media exceeds the byte budget");
			chunks.push(chunk.value);
		}
		if (length !== null && Number(length) !== size)
			throw new PublicMediaError("Public media length does not match its response");
		const bytes = new Uint8Array(size);
		let offset = 0;
		for (const chunk of chunks) {
			bytes.set(chunk, offset);
			offset += chunk.byteLength;
		}
		if (!signatureMatchesExt(ext, bytes.subarray(0, 12)))
			throw new PublicMediaError("Public media signature does not match the upload extension");
		return { bytes, contentType, ext: ext === "jpeg" ? "jpg" : ext };
	} catch (error) {
		if (error instanceof PublicMediaError) throw error;
		// A reader exception may carry signed URLs or storage credentials.
		throw new PublicMediaError("Approved public media could not be read");
	} finally {
		clearTimeout(timer);
		controller.abort();
		void (reader ? reader.cancel() : body?.cancel())?.catch(() => {});
	}
}

/** Derive assets from a validated, frozen public snapshot without mutating it. */
export async function bundleReferencedPublicMedia(
	snapshot: PublicSnapshot,
	source?: PublicMediaSource,
) {
	const rewritten = structuredClone(snapshot);
	if (source && (source.origins.length === 0 || source.origins.length > 8))
		throw new PublicMediaError("Configure between one and eight approved media origins");
	const origins = new Set([snapshot.publicOrigin, ...(source?.origins.map(sourceOrigin) ?? [])]);
	const { refs, finish } = references(rewritten);
	const uploads = new Map<string, MediaReference[]>();
	const dependencies = new Map<string, MediaDependency>();
	for (const ref of refs) {
		const url = new URL(ref.url);
		const rawPath = ref.url.match(/^https?:\/\/[^/?#]+([^?#]*)/i)?.[1] || "/";
		const owned = origins.has(url.origin);
		if (owned && (url.pathname.startsWith("/api/images/") || rawPath.startsWith("/api/images/"))) {
			const key = url.pathname.slice("/api/images/".length);
			if (rawPath !== url.pathname || url.search || url.hash || !isPublicImageKey(key))
				throw new PublicMediaError("Only canonical, approved public upload keys can be bundled");
			if (!source) dependencies.set(ref.url, { url: ref.url, kind: "unresolved-upload" });
			else uploads.set(key, [...(uploads.get(key) ?? []), ref]);
		} else if (ref.image) {
			dependencies.set(ref.url, {
				url: ref.url,
				kind: url.origin === snapshot.publicOrigin ? "local-non-upload" : "external",
			});
		}
	}
	if (uploads.size > PUBLIC_MEDIA_LIMITS.files)
		throw new PublicMediaError("Public media exceeds the 64-upload publication limit");
	const files = new Map<string, Uint8Array>();
	const bundled = new Map<string, BundledPublicMedia>();
	let totalBytes = 0;
	for (const [key, references] of [...uploads].sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))) {
		const media = await readUpload(source!, key, PUBLIC_MEDIA_LIMITS.totalBytes - totalBytes);
		totalBytes += media.bytes.byteLength;
		const sha256 = createHash("sha256").update(media.bytes).digest("hex");
		const file = `assets/media-${sha256}.${media.ext}`;
		files.set(file, media.bytes);
		bundled.set(file, {
			path: file,
			sha256,
			bytes: media.bytes.byteLength,
			contentType: media.contentType,
		});
		for (const reference of references) reference.set(`${snapshot.publicOrigin}/${file}`);
	}
	for (const serialize of finish) serialize();
	const retained = [...dependencies.values()].sort((a, b) =>
		a.url < b.url ? -1 : a.url > b.url ? 1 : 0,
	);
	return {
		snapshot: rewritten,
		files,
		bundled: [...bundled.values()],
		dependencies: retained,
		externalMediaOrigins: [...new Set(retained.map(({ url }) => new URL(url).origin))].sort(),
		customCssReview: !!snapshot.settings.custom_css?.trim(),
		externalHttpReview: retained.some(({ url }) => {
			const parsed = new URL(url);
			return (
				parsed.protocol === "http:" &&
				!["localhost", "127.0.0.1", "[::1]"].includes(parsed.hostname)
			);
		}),
	};
}

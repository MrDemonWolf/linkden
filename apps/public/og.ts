import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import { type OgSource, ogContentFromPage } from "../web/src/lib/og-params";
import { OG_IMAGE_SIZE } from "../web/src/lib/og-template";
import type { BundledPublicMedia } from "./media";

export class StaticOgError extends Error {}

const MAX_RENDER_BYTES = 5 * 1024 * 1024;
const RENDER_TIMEOUT_MS = 20_000;

/** The child can render data images and installed fonts, with every HTTP read denied. */
function renderOffline(input: string): Promise<Buffer> {
	if (Buffer.byteLength(input) > 8 * 1024 * 1024)
		throw new StaticOgError("The OG template input exceeds its publication limit");
	return new Promise((resolve, reject) => {
		const child = spawn(
			process.execPath,
			["--no-install", fileURLToPath(new URL("./og-render.ts", import.meta.url))],
			{
				stdio: ["pipe", "pipe", "pipe"],
				env: { PATH: process.env.PATH ?? "", NODE_ENV: "production" },
			},
		);
		const chunks: Buffer[] = [];
		let length = 0;
		let diagnostics = "";
		let budgetFailure = "";
		const timer = setTimeout(() => {
			budgetFailure = "The offline OG renderer exceeded its time budget";
			child.kill("SIGKILL");
		}, RENDER_TIMEOUT_MS);
		child.stdout.on("data", (chunk: Buffer) => {
			length += chunk.length;
			if (length > MAX_RENDER_BYTES) {
				budgetFailure = "The offline OG image exceeds its byte budget";
				child.kill("SIGKILL");
			} else chunks.push(chunk);
		});
		child.stderr.on("data", (chunk: Buffer) => {
			// Never forward renderer output, which can include owner-supplied text.
			if (diagnostics.length < 1_024)
				diagnostics += chunk.toString().slice(0, 1_024 - diagnostics.length);
		});
		child.stdin.on("error", () => {});
		child.on("error", () => {
			clearTimeout(timer);
			reject(new StaticOgError("The offline OG renderer could not start"));
		});
		child.on("close", (code) => {
			clearTimeout(timer);
			if (budgetFailure) reject(new StaticOgError(budgetFailure));
			else if (diagnostics.includes("STATIC_OG_NETWORK_REQUIRED"))
				reject(
					new StaticOgError(
						"The OG template needs glyphs or emoji outside the bundled font; use supported text or review an offline font",
					),
				);
			else if (code !== 0)
				reject(new StaticOgError("The offline OG template could not be rendered"));
			else resolve(Buffer.concat(chunks));
		});
		child.stdin.end(input);
	});
}

/** Generate one configured template from public fields and approved in-memory media only. */
export async function generateStaticOgImage(
	page: OgSource,
	publicOrigin: string,
	media: { files: ReadonlyMap<string, Uint8Array>; bundled: readonly BundledPublicMedia[] },
) {
	const { params } = ogContentFromPage(page, null, publicOrigin, new Set([publicOrigin]));
	let avatarDataUrl = "";
	if (params.template === "profile" && page.profile?.image) {
		const asset = media.bundled.find(
			(file) =>
				`${publicOrigin}/${file.path}` === page.profile?.image &&
				["image/png", "image/jpeg", "image/gif"].includes(file.contentType),
		);
		const bytes = asset && media.files.get(asset.path);
		if (asset && bytes)
			avatarDataUrl = `data:${asset.contentType};base64,${Buffer.from(bytes).toString("base64")}`;
	}
	const bytes = await renderOffline(JSON.stringify({ params, avatarDataUrl }));
	if (
		bytes.length < 24 ||
		bytes.subarray(0, 8).toString("hex") !== "89504e470d0a1a0a" ||
		bytes.subarray(12, 16).toString() !== "IHDR" ||
		bytes.readUInt32BE(16) !== OG_IMAGE_SIZE.width ||
		bytes.readUInt32BE(20) !== OG_IMAGE_SIZE.height
	)
		throw new StaticOgError("The offline OG renderer returned an invalid PNG");
	const sha256 = createHash("sha256").update(bytes).digest("hex");
	return {
		path: `assets/og-${sha256}.png`,
		bytes,
		sha256,
		...OG_IMAGE_SIZE,
		template: params.template,
		avatar:
			params.template === "profile"
				? avatarDataUrl
					? ("bundled" as const)
					: ("initials" as const)
				: ("unused" as const),
	};
}

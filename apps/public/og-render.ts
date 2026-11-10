import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { normalizeOgParams } from "../web/src/lib/og-params";
import { OG_IMAGE_SIZE, renderOgTemplate } from "../web/src/lib/og-template";
import { createOfflineOgFetch } from "./og-offline-fetch";

// ImageResponse automatically loads missing fonts/emoji over HTTP. Isolate the
// offline policy here rather than changing fetch in the publication process.
let attemptedNetwork = false;
globalThis.fetch = createOfflineOgFetch(() => {
	attemptedNetwork = true;
});
// The renderer logs unsupported text in its dynamic-font error. Keep owner
// content out of process diagnostics; only fixed error codes leave this child.
console.log = console.info = console.warn = console.error = () => {};

try {
	const chunks: Buffer[] = [];
	let length = 0;
	for await (const value of process.stdin) {
		const chunk = Buffer.from(value);
		length += chunk.length;
		if (length > 8 * 1024 * 1024) throw new Error("OG input limit");
		chunks.push(chunk);
	}
	const input = JSON.parse(Buffer.concat(chunks).toString("utf8"));
	const params = normalizeOgParams(new URLSearchParams(input.params));
	if (
		JSON.stringify(params) !== JSON.stringify(input.params) ||
		typeof input.avatarDataUrl !== "string" ||
		(input.avatarDataUrl &&
			!/^data:image\/(?:png|jpeg|gif);base64,[A-Za-z0-9+/=]+$/.test(input.avatarDataUrl))
	)
		throw new Error("Invalid offline OG input");
	const web = fileURLToPath(new URL("../web/", import.meta.url));
	const require = createRequire(path.join(web, "package.json"));
	const { ImageResponse } = await import(require.resolve("next/og"));
	// Same bundled SIL-OFL Geist face as the installed live ImageResponse.
	const font = await readFile(
		path.join(
			path.dirname(require.resolve("next/package.json")),
			"dist/compiled/@vercel/og/Geist-Regular.ttf",
		),
	);
	const image = new ImageResponse(renderOgTemplate(params, input.avatarDataUrl), {
		...OG_IMAGE_SIZE,
		fonts: [{ name: "geist", data: font, weight: 400, style: "normal" }],
	});
	const bytes = new Uint8Array(await image.arrayBuffer());
	if (attemptedNetwork) throw new Error("Remote glyphs required");
	process.stdout.write(bytes);
} catch {
	process.stderr.write(attemptedNetwork ? "STATIC_OG_NETWORK_REQUIRED" : "STATIC_OG_RENDER_FAILED");
	process.exitCode = 1;
}

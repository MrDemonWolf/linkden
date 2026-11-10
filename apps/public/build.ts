import { createHash } from "node:crypto";
import {
	copyFile,
	lstat,
	mkdir,
	readdir,
	readFile,
	rename,
	rm,
	stat,
	writeFile,
} from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
	createPublicationArtifactFromSnapshot,
	createPublicationSnapshot,
} from "../../scripts/lib/public-artifacts";
import { renderStaticDocument } from "../web/src/components/public/static-document";
import { prepareStaticPublicPage } from "../web/src/lib/static-public-page";
import { bundleReferencedPublicMedia, type PublicMediaSource } from "./media";
import { generateStaticOgImage, StaticOgError } from "./og";
import { createStaticSecurityFiles } from "./security";

const repo = fileURLToPath(new URL("../../", import.meta.url));
const web = path.join(repo, "apps/web");
const webRequire = createRequire(path.join(web, "package.json"));
const tailwindPath = webRequire.resolve("@tailwindcss/postcss");
const postcss = createRequire(tailwindPath)("postcss");
const tailwind = webRequire("@tailwindcss/postcss");
const hash = (value: string | Uint8Array) => createHash("sha256").update(value).digest("hex");

export interface PublicBuildOptions {
	media?: PublicMediaSource;
}

/** Project authoring data once; frozen publication jobs use buildStaticSnapshot directly. */
export function buildPublicSite(
	input: unknown,
	outputRoot: string,
	contactAction?: string,
	options?: PublicBuildOptions,
) {
	return buildStaticSnapshot(createPublicationSnapshot(input), outputRoot, contactAction, options);
}

/** Build the exact frozen revision. No authoring rereads, schedule filtering, or deployment. */
export async function buildStaticSnapshot(
	input: unknown,
	outputRoot: string,
	contactAction?: string,
	options?: PublicBuildOptions,
) {
	const artifacts = createPublicationArtifactFromSnapshot(input);
	const destination = path.resolve(outputRoot, artifacts.snapshot.revision);
	await mkdir(outputRoot, { recursive: true });
	try {
		await lstat(destination);
		throw new Error("A static publication revision already exists");
	} catch (error) {
		if (!(error instanceof Error && "code" in error && error.code === "ENOENT")) throw error;
	}
	const temporary = `${destination}.building-${crypto.randomUUID()}`;
	await mkdir(temporary);
	try {
		const media = await bundleReferencedPublicMedia(artifacts.snapshot, options?.media);
		const { payload, files } = await prepareStaticPublicPage(media.snapshot, contactAction);
		const og =
			media.snapshot.settings.seo_og_mode === "template"
				? await generateStaticOgImage(payload.data, media.snapshot.publicOrigin, media)
				: null;
		if (og) payload.data.settings.seoOgImage = `${media.snapshot.publicOrigin}/${og.path}`;
		const binaryFiles = new Map(media.files);
		if (og) binaryFiles.set(og.path, og.bytes);
		const assetsDir = path.join(temporary, "assets");
		await mkdir(assetsDir);
		for (const [file, bytes] of binaryFiles)
			await writeFile(path.join(temporary, file), bytes, { flag: "wx" });
		const fonts = await readdir(path.join(web, "public/fonts"));
		await mkdir(path.join(temporary, "fonts"));
		for (const file of fonts)
			await copyFile(path.join(web, "public/fonts", file), path.join(temporary, "fonts", file));
		const cssSource = path.join(web, "src/index.css");
		const css = (
			await postcss([tailwind({ base: web, optimize: true })]).process(
				await readFile(cssSource, "utf8"),
				{ from: cssSource },
			)
		).css as string;
		const cssPath = `assets/profile-${hash(css).slice(0, 20)}.css`;
		await writeFile(path.join(temporary, cssPath), css);
		const bundle = await Bun.build({
			entrypoints: [path.join(web, "src/components/public/static-client.tsx")],
			outdir: assetsDir,
			target: "browser",
			format: "esm",
			tsconfig: path.join(web, "tsconfig.json"),
			minify: true,
			splitting: true,
			naming: {
				entry: "profile-[hash].[ext]",
				chunk: "chunk-[hash].[ext]",
				asset: "asset-[hash].[ext]",
			},
			define: {
				"process.env.NODE_ENV": JSON.stringify("production"),
				"process.env.NEXT_PUBLIC_SERVER_URL": JSON.stringify(""),
			},
			plugins: [
				{
					name: "public-only",
					setup(build) {
						build.onResolve(
							{
								filter:
									/^(?:@\/utils\/trpc|@\/lib\/auth-client|@linkden\/(?:db|auth|env)|next(?:\/|$))/,
							},
							() => {
								throw new Error("Private application dependency reached the public bundle");
							},
						);
					},
				},
			],
		});
		if (!bundle.success) throw new Error("Static browser bundle failed");
		const entry = bundle.outputs.find((file) => file.kind === "entry-point");
		if (!entry) throw new Error("Static browser entry is missing");
		const script = `/${path.relative(temporary, entry.path).split(path.sep).join("/")}`;
		files.set(
			"index.html",
			await renderStaticDocument(media.snapshot, payload, {
				script,
				stylesheet: `/${cssPath}`,
			}),
		);
		files.set(
			"404.html",
			'<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Page not found · LinkDen</title></head><body><main><h1>Page not found</h1><p>This path is not published.</p><a href="/">Open profile</a></main></body></html>',
		);
		for (const [file, contents] of createStaticSecurityFiles({
			html: files.get("index.html")!,
			contactAction: payload.contactEndpoint,
			captchaProvider: media.snapshot.settings.captcha_provider,
			imageOrigins: media.externalMediaOrigins,
			customCss: media.snapshot.settings.custom_css,
		}))
			files.set(file, contents);
		for (const [file, contents] of files)
			await writeFile(path.join(temporary, file), contents, { flag: "wx" });
		const outputFiles = [
			...files.keys(),
			...binaryFiles.keys(),
			...fonts.map((file) => `fonts/${file}`),
			cssPath,
			...bundle.outputs.map((file) =>
				path.relative(temporary, file.path).split(path.sep).join("/"),
			),
		];
		const manifest = {
			...artifacts.manifest,
			status: "local-static-renderer-only",
			deployable: false,
			nextVisibilityBoundary: artifacts.snapshot.nextVisibilityBoundary,
			pending: [
				...(media.dependencies.some((dependency) => dependency.kind === "unresolved-upload")
					? ["referenced-media-bundle"]
					: []),
				...(media.dependencies.some((dependency) => dependency.kind === "local-non-upload")
					? ["unresolved-local-media"]
					: []),
				...(media.dependencies.some((dependency) => dependency.kind === "external")
					? ["external-media-dependencies"]
					: []),
				...(media.externalHttpReview ? ["external-http-media-review"] : []),
				...(media.customCssReview ? ["custom-css-media-review"] : []),
				...(og ? [] : ["template-og-image"]),
				"scheduled-publication",
				"publication-controller",
				"service-worker-upgrade",
				"staging-routing-proof",
				"public-contact-integration",
				"static-security-policy",
			],
			media: {
				bundled: media.bundled,
				dependencies: media.dependencies,
			},
			og: og
				? {
						path: og.path,
						sha256: og.sha256,
						width: og.width,
						height: og.height,
						template: og.template,
						avatar: og.avatar,
					}
				: null,
			files: await Promise.all(
				[...new Set(outputFiles)].sort().map(async (file) => ({
					path: file,
					sha256: hash(await readFile(path.join(temporary, file))),
				})),
			),
		};
		await writeFile(
			path.join(temporary, "manifest.json"),
			`${JSON.stringify(manifest, null, 2)}\n`,
			{ flag: "wx" },
		);
		await rename(temporary, destination);
		return { destination, manifest };
	} catch (error) {
		await rm(temporary, { recursive: true, force: true });
		throw error;
	}
}

if (import.meta.main) {
	const [inputPath, outputRoot, contactAction] = process.argv.slice(2);
	if (!inputPath || !outputRoot || process.argv.length > 5) {
		console.error(
			"Usage: bun apps/public/build.ts <input.json> <output-root> [public-contact-action]",
		);
		process.exitCode = 1;
	} else {
		try {
			if ((await stat(inputPath)).size > 4 * 1024 * 1024)
				throw new Error("Publication input exceeds 4 MiB");
			const result = await buildPublicSite(
				JSON.parse(await readFile(inputPath, "utf8")),
				outputRoot,
				contactAction,
			);
			console.log(`Created local static renderer: ${result.destination}`);
			console.log(
				"Not deployable: read manifest.json for media, scheduling, and integration gates.",
			);
		} catch (error) {
			console.error(
				error instanceof StaticOgError
					? error.message
					: "Static build failed. Check validated input, contact/CAPTCHA configuration, and revision uniqueness.",
			);
			process.exitCode = 1;
		}
	}
}

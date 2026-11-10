// @vitest-environment node
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdtemp, readdir, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { expect, it } from "vitest";
import { createPublicationSnapshot } from "../../packages/validators/src/publication";

it("builds immutable public HTML/assets with verified hashes and no application runtime", async () => {
	const directory = await mkdtemp(path.join(os.tmpdir(), "linkden-public-site-"));
	try {
		const input = path.join(directory, "input.json");
		const output = path.join(directory, "output");
		await writeFile(
			input,
			JSON.stringify({
				revision: "proof",
				publicOrigin: "https://profile.example.test",
				builtAt: "2026-11-05T12:00:00.000Z",
				profile: { name: "Public Name", image: null, bio: "Published content", isVerified: false },
				settings: {
					email_api_key: "PRIVATE_TEST_KEY",
					vcard_enabled: "true",
					vcard_data: JSON.stringify({ fullName: "Public Name" }),
				},
				blocks: [
					{
						id: "link",
						type: "link",
						title: "Website",
						url: "https://example.com",
						config: "{}",
						position: 0,
						isEnabled: true,
						status: "published",
					},
				],
				socialNetworks: [],
			}),
		);
		const run = () =>
			spawnSync("bun", ["apps/public/build.ts", input, output], {
				cwd: process.cwd(),
				encoding: "utf8",
				timeout: 120_000,
			});
		const first = run();
		expect(first.status, first.stderr).toBe(0);
		const revision = path.join(output, "proof");
		const html = await readFile(path.join(revision, "index.html"), "utf8");
		expect(html).toContain("Public Name");
		expect(html).toContain("Published content");
		expect(html).not.toContain("PRIVATE_TEST_KEY");
		expect(html).not.toContain("/api/vcard");
		expect(html.match(/<!doctype html>/gi) ?? []).toHaveLength(1);
		const manifest = JSON.parse(await readFile(path.join(revision, "manifest.json"), "utf8")) as {
			deployable: boolean;
			pending: string[];
			files: { path: string; sha256: string }[];
		};
		expect(manifest.deployable).toBe(false);
		expect(manifest.pending).toContain("staging-routing-proof");
		expect(manifest.pending).toContain("static-security-policy");
		expect(manifest.pending).toContain("service-worker-upgrade");
		expect(manifest.pending).not.toContain("public-font-bundle");
		const cssFile = manifest.files.find((file) => file.path.endsWith(".css"));
		const css = await readFile(path.join(revision, cssFile!.path), "utf8");
		const fonts = [...css.matchAll(/url\(["']?\/?(fonts\/[^)"']+\.woff2)["']?\)/g)];
		expect(fonts).toHaveLength(4);
		expect(css).toContain("--font-public-sans");
		for (const [, file] of fonts) {
			expect(manifest.files.some((asset) => asset.path === file)).toBe(true);
			expect((await readFile(path.join(revision, file))).subarray(0, 4).toString()).toBe("wOF2");
		}
		expect(css).not.toContain("fonts.gstatic.com");
		for (const file of manifest.files)
			expect(
				createHash("sha256")
					.update(await readFile(path.join(revision, file.path)))
					.digest("hex"),
			).toBe(file.sha256);
		const entry = manifest.files.find((file) => /^assets\/profile-.*\.js$/.test(file.path));
		expect(entry).toBeDefined();
		expect(manifest.files.filter((file) => file.path.endsWith(".js")).length).toBeLessThan(10);
		const script = await readFile(path.join(revision, entry!.path), "utf8");
		for (const forbidden of [
			"/trpc",
			"get-session",
			"public.trackView",
			"public.trackClick",
			"BETTER_AUTH_SECRET",
		])
			expect(script).not.toContain(forbidden);
		expect(await readdir(revision)).not.toContain("_worker.js");
		expect(await readFile(path.join(revision, "404.html"), "utf8")).toContain("Page not found");
		const headers = await readFile(path.join(revision, "_headers"), "utf8");
		expect(headers).toContain("Content-Security-Policy:");
		expect(headers).toContain("script-src 'self' 'sha256-");
		expect(headers).not.toContain("unsafe-eval");
		expect(headers).toContain("/sw.js\n  Cache-Control: no-store");
		expect(manifest.files.some((file) => file.path === "sw.js")).toBe(true);
		const worker = await readFile(path.join(revision, "sw.js"), "utf8");
		expect(worker).toContain("registration.unregister()");
		expect(worker).not.toContain('addEventListener("fetch"');
		expect(run().status).toBe(1);
		expect(await readFile(path.join(revision, "index.html"), "utf8")).toBe(html);
		expect((await readdir(output)).some((file) => file.includes(".building-"))).toBe(false);
	} finally {
		await rm(directory, { recursive: true, force: true });
	}
}, 120_000);

it("publishes the configured template OG as a hashed PNG and preserves it after an unsupported-text failure", async () => {
	const directory = await mkdtemp(path.join(os.tmpdir(), "linkden-template-og-"));
	try {
		const snapshot = createPublicationSnapshot({
			revision: "template-og",
			publicOrigin: "https://profile.example.test",
			builtAt: "2026-11-05T12:00:00.000Z",
			profile: {
				name: "Static <script>Wolf</script>",
				image: null,
				bio: "Saved template content",
				isVerified: false,
			},
			settings: { seo_og_mode: "template", seo_og_template: "profile", custom_primary: "#123456" },
			blocks: [],
			socialNetworks: [],
		});
		const input = path.join(directory, "snapshot.json");
		const output = path.join(directory, "output");
		const runner = path.join(directory, "build.ts");
		const inputJson = JSON.stringify(snapshot);
		await writeFile(input, inputJson);
		await writeFile(
			runner,
			`
import { buildStaticSnapshot } from ${JSON.stringify(path.join(process.cwd(), "apps/public/build.ts"))};
const [input, output] = process.argv.slice(2);
try { await buildStaticSnapshot(JSON.parse(await Bun.file(input).text()), output); }
catch (error) { console.error(error.message); process.exitCode = 1; }
`,
		);
		const run = () =>
			spawnSync("bun", ["--no-install", runner, input, output], {
				cwd: process.cwd(),
				encoding: "utf8",
				timeout: 120_000,
			});
		const result = run();
		expect(result.status, result.stderr).toBe(0);
		const destination = path.join(output, snapshot.revision);
		const manifest = JSON.parse(await readFile(path.join(destination, "manifest.json"), "utf8"));
		expect(manifest.deployable).toBe(false);
		expect(manifest.pending).not.toContain("template-og-image");
		expect(manifest.pending).toContain("staging-routing-proof");
		expect(manifest.og).toMatchObject({
			width: 1200,
			height: 630,
			template: "profile",
			avatar: "initials",
		});
		const bytes = await readFile(path.join(destination, manifest.og.path));
		expect(bytes.subarray(0, 8).toString("hex")).toBe("89504e470d0a1a0a");
		expect([bytes.readUInt32BE(16), bytes.readUInt32BE(20)]).toEqual([1200, 630]);
		const sha256 = createHash("sha256").update(bytes).digest("hex");
		expect(manifest.og.sha256).toBe(sha256);
		expect(manifest.files).toContainEqual({ path: manifest.og.path, sha256 });
		const html = await readFile(path.join(destination, "index.html"), "utf8");
		const url = `${snapshot.publicOrigin}/${manifest.og.path}`;
		expect(html).toContain(`property="og:image" content="${url}"`);
		expect(html).toContain(`name="twitter:image" content="${url}"`);
		expect(html).toContain("Static &lt;script&gt;Wolf&lt;/script&gt;");
		expect(await readFile(input, "utf8")).toBe(inputJson);
		await writeFile(
			input,
			JSON.stringify({
				...snapshot,
				revision: "unsupported-og",
				profile: { ...snapshot.profile, name: "PRIVATE_MARKER 🐺" },
			}),
		);
		const failed = run();
		expect(failed.status).toBe(1);
		expect(failed.stderr).toContain("outside the bundled font");
		expect(failed.stderr).not.toContain("PRIVATE_MARKER");
		expect(await readdir(output)).toEqual([snapshot.revision]);
		expect(await readFile(path.join(destination, "index.html"), "utf8")).toBe(html);
		expect(await readFile(path.join(destination, manifest.og.path))).toEqual(bytes);
	} finally {
		await rm(directory, { recursive: true, force: true });
	}
}, 120_000);

it("builds the exact frozen revision with only approved referenced media and preserves prior artifacts on failure", async () => {
	const directory = await mkdtemp(path.join(os.tmpdir(), "linkden-public-media-"));
	try {
		const api = "https://api.example.test";
		const png =
			"iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=";
		const snapshot = createPublicationSnapshot({
			revision: "frozen-media",
			publicOrigin: "https://profile.example.test",
			builtAt: "2026-11-05T12:00:00.000Z",
			profile: {
				name: "Frozen profile",
				image: `${api}/api/images/avatar/1.png`,
				bio: null,
				isVerified: false,
			},
			settings: {
				vcard_enabled: "true",
				seo_og_mode: "custom",
				seo_og_image: `${api}/api/images/og_image/1.png`,
			},
			blocks: [
				{
					id: "image",
					type: "image",
					config: JSON.stringify({ src: `${api}/api/images/block_image/1.png` }),
					position: 0,
					isEnabled: true,
					status: "published",
					scheduledEnd: "2026-11-05T13:00:00.000Z",
				},
				{
					id: "vcard",
					type: "vcard",
					title: "Contact",
					config: JSON.stringify({
						fullName: "Frozen profile",
						photo: `${api}/api/images/avatar/1.png`,
					}),
					position: 1,
					isEnabled: true,
					status: "published",
				},
				{
					id: "hidden",
					type: "image",
					config: JSON.stringify({ src: `${api}/api/images/wallet_logo/private.png` }),
					position: 2,
					isEnabled: false,
					status: "published",
				},
			],
			socialNetworks: [],
		});
		const input = path.join(directory, "snapshot.json");
		const output = path.join(directory, "output");
		const runner = path.join(directory, "build.ts");
		const inputJson = JSON.stringify(snapshot);
		await writeFile(input, inputJson);
		await writeFile(
			runner,
			`
import { buildStaticSnapshot } from ${JSON.stringify(path.join(process.cwd(), "apps/public/build.ts"))};
const [input, output, mode] = process.argv.slice(2);
const reads: string[] = [];
try {
  const result = await buildStaticSnapshot(JSON.parse(await Bun.file(input).text()), output, undefined, {
    media: { origins: [${JSON.stringify(api)}], read: async (key, signal) => {
      if (!["avatar/1.png", "block_image/1.png", "og_image/1.png"].includes(key)) throw new Error("Unexpected private read");
      reads.push(key);
      return new Response(mode === "bad" ? "forged" : Buffer.from(${JSON.stringify(png)}, "base64"), {
        headers: { "content-type": mode === "bad" ? "text/html" : "image/png" }
      });
    } }
  });
  console.log(JSON.stringify({ destination: result.destination, reads }));
} catch (error) { console.error(error.message); process.exitCode = 1; }
`,
		);
		const run = (mode = "good") =>
			spawnSync("bun", [runner, input, output, mode], {
				cwd: process.cwd(),
				encoding: "utf8",
				timeout: 120_000,
			});
		const result = run();
		expect(result.status, result.stderr).toBe(0);
		expect(JSON.parse(result.stdout).reads).toEqual([
			"avatar/1.png",
			"block_image/1.png",
			"og_image/1.png",
		]);
		const destination = path.join(output, snapshot.revision);
		const html = await readFile(path.join(destination, "index.html"), "utf8");
		const manifest = JSON.parse(await readFile(path.join(destination, "manifest.json"), "utf8"));
		expect(manifest.deployable).toBe(false);
		expect(manifest.nextVisibilityBoundary).toBe(snapshot.nextVisibilityBoundary);
		expect(manifest.media.bundled).toHaveLength(1);
		expect(manifest.media.dependencies).toEqual([]);
		expect(manifest.pending).not.toContain("referenced-media-bundle");
		expect(manifest.pending).toContain("staging-routing-proof");
		expect(html).toContain("Frozen profile");
		expect(html).toContain("ld-image-block");
		expect(html).not.toContain("/api/images/");
		expect(html).not.toContain("private.png");
		const media = manifest.media.bundled[0];
		expect(html).toContain(`https://profile.example.test/${media.path}`);
		expect(await readFile(path.join(destination, media.path))).toEqual(Buffer.from(png, "base64"));
		for (const file of manifest.files)
			expect(
				createHash("sha256")
					.update(await readFile(path.join(destination, file.path)))
					.digest("hex"),
			).toBe(file.sha256);
		const card = manifest.files.find((file: { path: string }) => file.path.endsWith(".vcf"));
		expect(await readFile(path.join(destination, card.path), "utf8")).toContain(
			`PHOTO;VALUE=uri:https://profile.example.test/${media.path}`,
		);
		expect(await readFile(input, "utf8")).toBe(inputJson);
		// A duplicate immutable revision fails before a reader is called.
		expect(run("bad").status).toBe(1);
		await writeFile(input, JSON.stringify({ ...snapshot, revision: "failed-media" }));
		const failed = run("bad");
		expect(failed.status).toBe(1);
		expect(failed.stderr).toContain("MIME type");
		expect(await readdir(output)).toEqual([snapshot.revision]);
		expect(await readFile(path.join(destination, "index.html"), "utf8")).toBe(html);
	} finally {
		await rm(directory, { recursive: true, force: true });
	}
}, 120_000);

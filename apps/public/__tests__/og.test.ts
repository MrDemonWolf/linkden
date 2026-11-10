// @vitest-environment node
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

let directory: string;
beforeAll(async () => {
	directory = await mkdtemp(path.join(os.tmpdir(), "linkden-static-og-"));
});
afterAll(async () => {
	await rm(directory, { recursive: true, force: true });
});
const origin = "https://profile.example.test";
const png =
	"iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=";
const code = `
import { generateStaticOgImage } from ${JSON.stringify(path.join(process.cwd(), "apps/public/og.ts"))};
const input = await Bun.stdin.json();
const files = new Map((input.media ?? []).map(row => [row.path, Buffer.from(row.base64, "base64")]));
try {
  const result = await generateStaticOgImage(input.page, input.origin, {files, bundled: input.media ?? []});
  await Bun.write(input.output, result.bytes);
  console.log(JSON.stringify({path:result.path,sha256:result.sha256,width:result.width,height:result.height,template:result.template,avatar:result.avatar}));
} catch (error) { console.error(error.message); process.exitCode = 1; }
`;
function render(
	template: string,
	options: {
		name?: string;
		image?: string;
		media?: { path: string; contentType: string; base64: string }[];
	} = {},
) {
	const output = path.join(directory, crypto.randomUUID());
	const run = spawnSync("bun", ["--no-install", "-e", code], {
		cwd: process.cwd(),
		encoding: "utf8",
		timeout: 30_000,
		input: JSON.stringify({
			output,
			origin,
			page: {
				profile: {
					name: options.name ?? "Blue Wolf",
					bio: "My public links",
					image: options.image ?? null,
				},
				settings: { seoOgTemplate: template, customPrimary: "#123456" },
			},
			media: options.media,
		}),
	});
	return { ...run, output };
}

describe("offline static OG images", () => {
	const hashes = new Set<string>();
	it.each(["minimal", "gradient", "bold", "profile"])(
		"renders an actual %s PNG with the expected dimensions",
		async (template) => {
			const result = render(template);
			expect(result.status, result.stderr).toBe(0);
			const metadata = JSON.parse(result.stdout);
			const bytes = await readFile(result.output);
			expect(bytes.subarray(0, 8).toString("hex")).toBe("89504e470d0a1a0a");
			expect([bytes.readUInt32BE(16), bytes.readUInt32BE(20)]).toEqual([1200, 630]);
			expect(metadata.template).toBe(template);
			expect(metadata.sha256).toBe(createHash("sha256").update(bytes).digest("hex"));
			expect(hashes.has(metadata.sha256)).toBe(false);
			hashes.add(metadata.sha256);
		},
		30_000,
	);

	it("uses only approved bundled avatar bytes and retains the initials fallback for remote avatars", async () => {
		const asset = { path: "assets/media-avatar.png", contentType: "image/png", base64: png };
		const approved = render("profile", { image: `${origin}/${asset.path}`, media: [asset] });
		expect(approved.status, approved.stderr).toBe(0);
		expect(JSON.parse(approved.stdout).avatar).toBe("bundled");
		const external = render("profile", { image: "https://unapproved.example.test/private.png" });
		expect(external.status, external.stderr).toBe(0);
		expect(JSON.parse(external.stdout).avatar).toBe("initials");
		expect(JSON.parse(external.stdout).sha256).not.toBe(JSON.parse(approved.stdout).sha256);
	}, 30_000);

	it.each(["image/webp", "image/x-icon"])(
		"retains the live initials fallback for unsupported %s avatars",
		(contentType) => {
			const asset = { path: "assets/media-unsupported", contentType, base64: png };
			const result = render("profile", { image: `${origin}/${asset.path}`, media: [asset] });
			expect(result.status, result.stderr).toBe(0);
			expect(JSON.parse(result.stdout).avatar).toBe("initials");
		},
		30_000,
	);

	it("rejects missing emoji assets without leaking text or attempting a provider connection", () => {
		const result = render("minimal", { name: "PRIVATE_MARKER 🐺" });
		expect(result.status).toBe(1);
		expect(result.stderr).toContain("outside the bundled font");
		expect(result.stderr).not.toContain("PRIVATE_MARKER");
	}, 30_000);
});

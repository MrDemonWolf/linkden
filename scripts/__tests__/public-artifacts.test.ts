// @vitest-environment node
import { execFileSync, spawnSync } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { createPublicationArtifacts } from "../lib/public-artifacts";

const block = (id = "live") => ({
	id,
	type: "link",
	title: "Community",
	url: "https://example.com/invite?from=qr#join",
	position: 1,
	isEnabled: true,
	status: "published",
	config: "{}",
});
const input = () => ({
	revision: "revision-1",
	publicOrigin: "https://mrdwolf.net",
	builtAt: "2026-11-05T12:00:00.000Z",
	profile: { name: "Wolf", image: null, bio: "Hello", isVerified: true },
	settings: { profile_name: "Wolf" },
	blocks: [block()],
	socialNetworks: [
		{ slug: "discord", url: "https://example.com/invite?from=qr#join", isActive: true },
	],
});

describe("public snapshot projection", () => {
	it("drops private records/settings, author metadata, unknown config keys, and nonvisible content", () => {
		const raw = input();
		const artifacts = createPublicationArtifacts({
			...raw,
			profile: { ...raw.profile, email: "PRIVATE_EMAIL" },
			settings: {
				...raw.settings,
				email_api_key: "PRIVATE_KEY",
				wallet_signer_key: "PRIVATE_SIGNER",
			},
			session: { token: "PRIVATE_SESSION" },
			inbox: [{ message: "PRIVATE_MESSAGE" }],
			blocks: [
				{
					...block(),
					config: JSON.stringify({ variant: "classic", privateKey: "PRIVATE_CONFIG" }),
					updatedAt: raw.builtAt,
				},
				{ ...block("draft"), status: "draft", title: "PRIVATE_DRAFT" },
				{ ...block("disabled"), isEnabled: false, title: "PRIVATE_DISABLED" },
				{ ...block("future"), scheduledStart: "2026-11-06T12:00:00.000Z", title: "PRIVATE_FUTURE" },
				{ ...block("expired"), scheduledEnd: "2026-11-04T12:00:00.000Z", title: "PRIVATE_EXPIRED" },
			],
		});
		expect(artifacts.snapshotJson).not.toContain("PRIVATE_");
		expect(artifacts.snapshotJson).not.toContain("updatedAt");
		expect(artifacts.snapshot.blocks).toHaveLength(1);
		expect(artifacts.snapshot.nextVisibilityBoundary).toBe("2026-11-06T12:00:00.000Z");
		expect(artifacts.snapshot.blocks[0]?.url).toBe("https://example.com/invite?from=qr#join");
		expect(artifacts.snapshot.socialNetworks[0]?.url).toBe(
			"https://example.com/invite?from=qr#join",
		);
		expect(artifacts.manifest.deployable).toBe(false);
	});

	it("projects structured public settings and preserves nested navigation without exporting unknown keys", () => {
		const artifacts = createPublicationArtifacts({
			...input(),
			settings: {
				branding_link: "https://example.com/invite?from=qr#join",
				vcard_enabled: "true",
				vcard_data: JSON.stringify({
					fullName: "Wolf",
					privateKey: "PRIVATE_VCARD",
					urls: [{ label: "Community", url: "https://example.com/invite?from=qr#join" }],
				}),
				consent_categories: JSON.stringify({
					analytics: false,
					marketing: false,
					functional: true,
					privateKey: "PRIVATE_CONSENT",
				}),
			},
			blocks: [
				{
					...block(),
					type: "location",
					config: JSON.stringify({
						linkType: "custom",
						customLinkUrl: "https://example.com/invite?from=qr#join",
					}),
				},
			],
		});
		expect(artifacts.snapshotJson).not.toContain("PRIVATE_");
		expect(artifacts.snapshot.settings.branding_link).toBe(
			"https://example.com/invite?from=qr#join",
		);
		expect(artifacts.snapshot.blocks[0]?.config).toContain(
			"https://example.com/invite?from=qr#join",
		);
		expect(artifacts.snapshot.settings.vcard_data).toContain(
			"https://example.com/invite?from=qr#join",
		);
	});

	it("rejects malformed structured settings and unsupported theme data without silently losing it", () => {
		for (const settings of [
			{ theme: JSON.stringify({ privateKey: "SECRET" }) },
			{ vcard_enabled: "true", vcard_data: "bad json" },
			{ contact_form_enabled: "yes" },
			{ theme_preset: "unavailable" },
			{ custom_primary: "javascript:red" },
			{ profile_name: "x".repeat(51) },
		])
			expect(() => createPublicationArtifacts({ ...input(), settings })).toThrow();
	});

	it("excludes disabled features and inactive saved alternatives from public snapshots", () => {
		const artifacts = createPublicationArtifacts({
			...input(),
			settings: {
				vcard_enabled: "false",
				vcard_data: JSON.stringify({ phone: "PRIVATE_PHONE" }),
				branding_pp_mode: "url",
				branding_pp_url: "https://example.com/privacy",
				branding_pp_text: "PRIVATE_LEGAL_TEXT",
				branding_tos_mode: "text",
				branding_tos_text: "Public terms",
				branding_tos_url: "https://example.com/PRIVATE_INACTIVE_TERMS",
				banner_enabled: "true",
				banner_mode: "preset",
				banner_custom_url: "https://example.com/PRIVATE_FUTURE_BANNER",
				seo_og_mode: "template",
				seo_og_image: "https://example.com/PRIVATE_UNUSED_OG",
				contact_form_enabled: "false",
				captcha_provider: "turnstile",
				captcha_site_key: "PRIVATE_FUTURE_CAPTCHA",
				consent_banner_enabled: "false",
				consent_banner_text: "PRIVATE_UNUSED_CONSENT",
			},
		});
		expect(artifacts.snapshotJson).not.toContain("PRIVATE_");
		expect(artifacts.snapshot.settings.branding_pp_url).toBe("https://example.com/privacy");
		expect(artifacts.snapshot.settings.branding_tos_text).toBe("Public terms");
		expect(artifacts.manifest.deployable).toBe(false);
	});

	it("preserves ordinary same-site URLs and rejects invalid visible blocks", () => {
		for (const url of [
			"https://mrdwolf.net/unknown",
			"https://example.com/invite?from=qr#join/",
			"https://example.com/invite?from=qr#join?x=1",
			"https://mrdwolf.net/%44iscord",
		]) {
			expect(() =>
				createPublicationArtifacts({ ...input(), blocks: [{ ...block(), url }] }),
			).not.toThrow();
		}
		expect(() =>
			createPublicationArtifacts({ ...input(), blocks: [{ ...block(), type: "unknown" }] }),
		).toThrow(/visible block/);
		expect(() =>
			createPublicationArtifacts({ ...input(), blocks: [{ ...block(), config: "bad json" }] }),
		).toThrow(/visible block/);
		expect(() => createPublicationArtifacts({ ...input(), blocks: [block(), block()] })).toThrow(
			/unique/,
		);
	});

	it("matches inclusive live schedule end and reports its next boundary", () => {
		const raw = input();
		const artifacts = createPublicationArtifacts({
			...raw,
			blocks: [{ ...block(), scheduledEnd: raw.builtAt }],
		});
		expect(artifacts.snapshot.blocks).toHaveLength(1);
		expect(artifacts.snapshot.nextVisibilityBoundary).toBe("2026-11-05T12:00:00.001Z");
	});

	it("hides disabled features and inactive socials", () => {
		const artifacts = createPublicationArtifacts({
			...input(),
			blocks: [
				{ ...block(), type: "connect" },
				{ ...block("vcard"), type: "vcard" },
			],
			socialNetworks: [{ slug: "discord", url: "https://example.com", isActive: false }],
		});
		expect(artifacts.snapshot.blocks).toEqual([]);
		expect(artifacts.snapshot.socialNetworks).toEqual([]);
	});
});

it("CLI builds immutable local revisions and leaves a prior artifact intact on failure", async () => {
	const dir = await mkdtemp(path.join(os.tmpdir(), "linkden-artifacts-"));
	try {
		const inputPath = path.join(dir, "input.json");
		const outputPath = path.join(dir, "output");
		await writeFile(inputPath, JSON.stringify(input()));
		const args = ["scripts/build-public-artifacts.ts", inputPath, outputPath];
		expect(execFileSync("bun", args, { encoding: "utf8" })).toContain("Not deployable");
		const snapshotPath = path.join(outputPath, "revision-1", "snapshot.json");
		const previous = await readFile(snapshotPath, "utf8");
		await writeFile(
			inputPath,
			JSON.stringify({ ...input(), profile: { ...input().profile, name: "New name" } }),
		);
		const duplicate = spawnSync("bun", args, { encoding: "utf8" });
		expect(duplicate.status).toBe(1);
		expect(await readFile(snapshotPath, "utf8")).toBe(previous);
		await writeFile(
			inputPath,
			JSON.stringify({ ...input(), blocks: [{ ...block(), url: "javascript:alert(1)" }] }),
		);
		const invalid = spawnSync("bun", args, { encoding: "utf8" });
		expect(invalid.status).toBe(1);
		expect(invalid.stderr).toContain("visible block is invalid");
		expect(await readFile(snapshotPath, "utf8")).toBe(previous);
	} finally {
		await rm(dir, { recursive: true, force: true });
	}
});

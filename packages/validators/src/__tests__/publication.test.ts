// @vitest-environment node
import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
	approvedPublicationSourceDigest,
	approvedPublicationSourceSchema,
	createApprovedPublicationSource,
	createPublicationSnapshot,
	publicationArtifactManifestJson,
	publicationCompletionSchema,
	publicationSourceDigest,
	publicationSourceJson,
	publicSnapshotSchema,
	snapshotFromApprovedSource,
} from "../publication";

function source() {
	return {
		revision: "revision-1",
		publicOrigin: "https://public.example",
		builtAt: "2026-11-05T12:00:00.000Z",
		profile: { name: "Ada", image: null, bio: "Public bio", isVerified: false },
		settings: {
			page_layout: "stacked",
			contact_form_enabled: "false",
			vcard_enabled: "false",
			vcard_data: '{"fullName":"PRIVATE_CARD"}',
			branding_pp_mode: "url",
			branding_pp_text: "PRIVATE_ALTERNATIVE",
			email_api_key: "PRIVATE_TOKEN",
		},
		blocks: [
			{ id: "visible", type: "text", position: 0, config: '{"body":"Public text"}' },
			{
				id: "draft",
				type: "text",
				position: 1,
				status: "draft",
				config: '{"body":"PRIVATE_DRAFT"}',
			},
			{
				id: "disabled",
				type: "text",
				position: 2,
				isEnabled: false,
				config: '{"body":"PRIVATE_DISABLED"}',
			},
			{
				id: "future",
				type: "text",
				position: 3,
				scheduledStart: "2026-11-06T00:00:00.000Z",
				config: '{"body":"PRIVATE_FUTURE"}',
			},
			{
				id: "feature-hidden",
				type: "connect",
				position: 4,
				config: '{"buttonText":"PRIVATE_FEATURE"}',
			},
		],
		socialNetworks: [
			{ slug: "github", url: "https://github.com/ada", isActive: true },
			{ slug: "discord", url: "https://example.com/PRIVATE_SOCIAL", isActive: false },
		],
	};
}

describe("frozen public publication contract", () => {
	it("retains only approved future data privately and derives immutable boundary snapshots", async () => {
		const input = source();
		const original = JSON.stringify(input);
		const approved = createApprovedPublicationSource(input);
		expect(approved.blocks.map((row) => row.id)).toEqual(["visible", "future"]);
		expect(JSON.stringify(approved)).toContain("PRIVATE_FUTURE");
		for (const omitted of [
			"PRIVATE_DRAFT",
			"PRIVATE_DISABLED",
			"PRIVATE_FEATURE",
			"PRIVATE_TOKEN",
			"PRIVATE_CARD",
			"PRIVATE_SOCIAL",
			"PRIVATE_LINK",
		])
			expect(JSON.stringify(approved)).not.toContain(omitted);
		const before = snapshotFromApprovedSource(approved, "before", input.builtAt);
		const atStart = snapshotFromApprovedSource(approved, "at-start", "2026-11-06T00:00:00.000Z");
		expect(before.blocks.map((row) => row.id)).toEqual(["visible"]);
		expect(JSON.stringify(before)).not.toContain("PRIVATE_FUTURE");
		expect(atStart.blocks.map((row) => row.id)).toEqual(["visible", "future"]);
		expect(JSON.stringify(atStart)).not.toContain("scheduledStart");
		expect(JSON.stringify(input)).toBe(original);
		const identity = { targetId: "target", rendererSourceId: "build" };
		const digest = await approvedPublicationSourceDigest(approved, identity);
		expect(
			await approvedPublicationSourceDigest(
				createApprovedPublicationSource({ ...input, builtAt: "2026-11-07T00:00:00.000Z" }),
				identity,
			),
		).toBe(digest);
		expect(
			await approvedPublicationSourceDigest(
				{
					...approved,
					blocks: approved.blocks.map((row) =>
						row.id === "future" ? { ...row, config: '{"body":"Changed future"}' } : row,
					),
				},
				identity,
			),
		).not.toBe(digest);
	});

	it("rejects private approval additions and invalid schedule windows rather than publishing them", () => {
		const approved = createApprovedPublicationSource(source());
		for (const invalid of [
			{ ...approved, session: { token: "PRIVATE" } },
			{ ...approved, settings: { ...approved.settings, wallet_signer_key: "PRIVATE" } },
			{
				...approved,
				blocks: [{ ...approved.blocks[0], config: '{"body":"Public","secret":"PRIVATE"}' }],
			},
			{
				...approved,
				blocks: [
					{
						...approved.blocks[0],
						scheduledStart: "2026-11-07T00:00:00.000Z",
						scheduledEnd: "2026-11-06T00:00:00.000Z",
					},
				],
			},
		])
			expect(approvedPublicationSourceSchema.safeParse(invalid).success).toBe(false);
	});

	it("preserves live position, creation time and ID ordering without publishing timestamps", () => {
		const input = source();
		const text = input.blocks[0]!;
		const snapshot = createPublicationSnapshot({
			...input,
			blocks: [
				{ ...text, id: "new-a", createdAt: "2026-11-04T00:00:00Z" },
				{ ...text, id: "old-z", createdAt: "2026-11-03T00:00:00Z" },
				{ ...text, id: "old-b", createdAt: "2026-11-03T00:00:00Z" },
			],
		});
		expect(snapshot.blocks.map((row) => row.id)).toEqual(["old-b", "old-z", "new-a"]);
		expect(JSON.stringify(snapshot.blocks)).not.toContain("createdAt");
	});

	it("retains only bounded public artifact paths and hashes in rollback receipts", () => {
		const manifest = {
			schemaVersion: 1,
			revision: "job",
			files: [
				{ path: "index.html", sha256: "a".repeat(64) },
				{ path: "assets/client.js", sha256: "b".repeat(64) },
			],
		};
		const artifactManifestJson = publicationArtifactManifestJson(manifest);
		expect(JSON.parse(artifactManifestJson).files[0].path).toBe("assets/client.js");
		const receipt = {
			revision: "job",
			runnerId: "runner",
			targetId: "target",
			rendererSourceId: "build",
			now: 1,
			artifactDigest: "c".repeat(64),
			deploymentId: "deployment",
			providerVersionId: "version",
			artifactManifestJson,
		};
		expect(publicationCompletionSchema.safeParse(receipt).success).toBe(true);
		expect(
			publicationCompletionSchema.safeParse({ ...receipt, revision: "wrong-job" }).success,
		).toBe(false);
		for (const invalid of [
			{ ...manifest, providerToken: "PRIVATE" },
			{ ...manifest, files: [{ path: "../private", sha256: "a".repeat(64) }] },
			{ ...manifest, files: [{ path: "/index.html", sha256: "a".repeat(64) }] },
			{ ...manifest, files: [manifest.files[0], manifest.files[0]] },
			{
				...manifest,
				files: Array.from({ length: 1000 }, (_, i) => ({
					path: `assets/${i}-${"x".repeat(220)}`,
					sha256: "a".repeat(64),
				})),
			},
		])
			expect(() => publicationArtifactManifestJson(invalid)).toThrow();
	});

	it("freezes only current public content while retaining the next boundary separately from hidden content", () => {
		const snapshot = createPublicationSnapshot(source());
		expect(snapshot.blocks.map((row) => row.id)).toEqual(["visible"]);
		expect(snapshot.nextVisibilityBoundary).toBe("2026-11-06T00:00:00.000Z");
		expect(snapshot.settings.page_layout).toBe("stacked");
		expect(snapshot.socialNetworks.map((row) => row.slug)).toEqual(["github"]);
		expect(JSON.stringify(snapshot)).not.toContain("PRIVATE_");
	});

	it("rejects private or raw-authoring additions to a frozen revision", () => {
		const snapshot = createPublicationSnapshot(source());
		for (const invalid of [
			{ ...snapshot, sessions: [] },
			{ ...snapshot, settings: { ...snapshot.settings, email_api_key: "PRIVATE" } },
			{ ...snapshot, settings: { ...snapshot.settings, vcard_data: '{"fullName":"Hidden"}' } },
			{ ...snapshot, blocks: [{ ...snapshot.blocks[0], status: "draft" }] },
			{
				...snapshot,
				blocks: [{ ...snapshot.blocks[0], config: '{"body":"Public text","private":"PRIVATE"}' }],
			},
		])
			expect(publicSnapshotSchema.safeParse(invalid).success).toBe(false);
	});

	it("shares exact canonical SHA-256 input across Workers and Node, excluding job metadata", async () => {
		const snapshot = createPublicationSnapshot(source());
		const identity = { targetId: "approved-target", rendererSourceId: "immutable-build-1" };
		const digest = await publicationSourceDigest(snapshot, identity);
		expect(digest).toBe(
			createHash("sha256").update(publicationSourceJson(snapshot, identity)).digest("hex"),
		);
		expect(
			await publicationSourceDigest(
				{
					...snapshot,
					revision: "another-job",
					builtAt: "2026-11-05T13:00:00.000Z",
					nextVisibilityBoundary: null,
				},
				identity,
			),
		).toBe(digest);
		expect(
			await publicationSourceDigest(snapshot, {
				...identity,
				rendererSourceId: "immutable-build-2",
			}),
		).not.toBe(digest);
		expect(
			await publicationSourceDigest(snapshot, { ...identity, targetId: "other-target" }),
		).not.toBe(digest);
		expect(
			await publicationSourceDigest(
				{ ...snapshot, profile: { ...snapshot.profile, bio: "Changed" } },
				identity,
			),
		).not.toBe(digest);
	});
});

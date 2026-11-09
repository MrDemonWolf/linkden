// @vitest-environment node
import { describe, expect, it } from "vitest";
import { publicationRunnerConfiguration } from "../runner-config";
import { nativeAssetConfiguration } from "../stage";

const source = "a".repeat(40);
const environment = {
	PUBLICATION_RUNNER_APPROVED: "true",
	CI: "true",
	GITHUB_REPOSITORY: "MrDemonWolf/linkden",
	GITHUB_REF: "refs/heads/main",
	GITHUB_SHA: source,
	GITHUB_RUN_ID: "123",
	GITHUB_RUN_ATTEMPT: "1",
	PUBLICATION_TARGET: "staging",
	PUBLICATION_RENDERER_SOURCE_ID: source,
	PUBLICATION_JOB_RENDERER_SOURCE_ID: source,
	PUBLICATION_REVISION: "revision-1",
	PUBLICATION_SOURCE_DIGEST: "b".repeat(64),
	PUBLIC_SITE_URL: "https://linkden-public-staging.owner.workers.dev",
	PUBLICATION_IMAGE_ORIGINS: '["https://admin.example.test"]',
};

describe("publication workflow preflight", () => {
	it("accepts only the configured main renderer and returns no credentials", () => {
		expect(publicationRunnerConfiguration(environment)).toEqual({
			operation: "publish",
			targetId: "staging",
			workerName: "linkden-public-staging",
			rendererSourceId: source,
			revision: "revision-1",
			sourceDigest: "b".repeat(64),
			runnerId: "123-1",
			publicOrigin: environment.PUBLIC_SITE_URL,
			mediaOrigins: ["https://admin.example.test"],
		});
	});
	it("requires an explicit recovery operation and rejects other operations", () => {
		expect(
			publicationRunnerConfiguration({ ...environment, PUBLICATION_OPERATION: "recover" })
				.operation,
		).toBe("recover");
		expect(() =>
			publicationRunnerConfiguration({ ...environment, PUBLICATION_OPERATION: "delete" }),
		).toThrow("operation");
	});
	it("accepts an unset optional image list as GitHub's empty string", () => {
		expect(
			publicationRunnerConfiguration({ ...environment, PUBLICATION_IMAGE_ORIGINS: "" })
				.mediaOrigins,
		).toEqual([]);
	});
	it.each([
		["PUBLICATION_RUNNER_APPROVED", "false"],
		["CI", "false"],
		["GITHUB_REPOSITORY", "other/linkden"],
		["GITHUB_REF", "refs/heads/feature"],
		["GITHUB_SHA", "c".repeat(40)],
		["PUBLICATION_JOB_RENDERER_SOURCE_ID", "c".repeat(40)],
		["PUBLICATION_RENDERER_SOURCE_ID", "latest"],
		["PUBLICATION_TARGET", "other"],
		["PUBLICATION_REVISION", "../../private"],
		["PUBLICATION_SOURCE_DIGEST", "wrong"],
		["GITHUB_RUN_ID", "1; whoami"],
		["GITHUB_RUN_ATTEMPT", "0x1"],
		["PUBLIC_SITE_URL", "http://example.test"],
		["PUBLIC_SITE_URL", "https://owner:secret@example.test"],
		["PUBLIC_SITE_URL", "https://example.test/path"],
		["PUBLIC_SITE_URL", "https://example.test/?secret=value"],
		["PUBLICATION_IMAGE_ORIGINS", '["http://example.test"]'],
		["PUBLICATION_IMAGE_ORIGINS", '["https://example.test/path"]'],
		["PUBLICATION_IMAGE_ORIGINS", '["https://owner:secret@example.test"]'],
		["PUBLICATION_IMAGE_ORIGINS", '{"origin":"https://example.test"}'],
	])("rejects unsafe %s before any provider access", (key, value) => {
		expect(() => publicationRunnerConfiguration({ ...environment, [key]: value })).toThrow();
	});
	it("generates a native assets-only candidate without executable fallback or app bindings", () => {
		expect(
			nativeAssetConfiguration("a".repeat(32), "linkden-public-staging", "/tmp/public"),
		).toEqual({
			account_id: "a".repeat(32),
			name: "linkden-public-staging",
			compatibility_date: "2026-04-24",
			workers_dev: true,
			preview_urls: false,
			assets: {
				directory: "/tmp/public",
				run_worker_first: false,
				html_handling: "auto-trailing-slash",
				not_found_handling: "404-page",
			},
			observability: { enabled: false },
		});
		expect(
			nativeAssetConfiguration("a".repeat(32), "linkden-public-production", "/tmp/public")
				.workers_dev,
		).toBe(false);
		expect(() =>
			nativeAssetConfiguration("a".repeat(32), "existing-admin", "/tmp/public"),
		).toThrow();
		expect(() =>
			nativeAssetConfiguration("a".repeat(32), "linkden-public-staging", "../private"),
		).toThrow();
	});
});

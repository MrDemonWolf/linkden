// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import { dispatchPublication, publicationConfiguration } from "../utils/publication-dispatch";

const configured = {
	PUBLICATION_ENABLED: "true",
	PUBLICATION_TARGET: "staging",
	PUBLICATION_RENDERER_SOURCE_ID: "a".repeat(40),
	PUBLIC_SITE_URL: "https://public.example.com",
	PUBLICATION_GITHUB_TOKEN: "private-test-token",
};
const job = {
	revision: "revision-1",
	sourceDigest: "b".repeat(64),
	targetId: "staging",
	rendererSourceId: "a".repeat(40),
};

describe("publication runner opt-in", () => {
	it.each([undefined, "", "false", "TRUE", "1"])("requires exact opt-in (%s)", (enabled) => {
		expect(publicationConfiguration({ ...configured, PUBLICATION_ENABLED: enabled }).enabled).toBe(
			false,
		);
	});
	it.each([
		{ PUBLICATION_TARGET: "other-worker" },
		{ PUBLICATION_RENDERER_SOURCE_ID: "main" },
		{ PUBLICATION_GITHUB_TOKEN: "" },
		{ PUBLIC_SITE_URL: "http://public.example.com" },
		{ PUBLIC_SITE_URL: "https://user:password@public.example.com" },
		{ PUBLIC_SITE_URL: "https://public.example.com/path" },
		{ PUBLIC_SITE_URL: "https://public.example.com/?secret=1" },
		{ PUBLIC_SITE_URL: "https://public.example.com/#fragment" },
		{ PUBLIC_SITE_URL: "invalid" },
	])("rejects incomplete or unsafe configuration %j", (changes) => {
		expect(publicationConfiguration({ ...configured, ...changes }).enabled).toBe(false);
	});
	it("returns only public target metadata, never the runner token", () => {
		expect(publicationConfiguration(configured)).toEqual({
			enabled: true,
			targetId: "staging",
			publicOrigin: "https://public.example.com",
			rendererSourceId: "a".repeat(40),
		});
	});
	it.each([undefined, "false", "TRUE", "1", "true"])(
		"requires an independent exact scheduler opt-in (%s)",
		(enabled) => {
			const result = publicationConfiguration({
				...configured,
				PUBLICATION_SCHEDULER_ENABLED: enabled,
			});
			expect(result.enabled && result.schedulerEnabled === true).toBe(enabled === "true");
			expect(JSON.stringify(result)).not.toContain(configured.PUBLICATION_GITHUB_TOKEN);
		},
	);
});

describe("publication dispatch", () => {
	it("dispatches only the configured job to the fixed trusted workflow", async () => {
		const transport = vi.fn<typeof fetch>().mockResolvedValue(new Response(null, { status: 204 }));
		await dispatchPublication(configured, job, transport);
		const [url, init] = transport.mock.calls[0]!;
		expect(url).toBe(
			"https://api.github.com/repos/MrDemonWolf/linkden/actions/workflows/publish-public.yml/dispatches",
		);
		expect(init?.redirect).toBe("error");
		expect(init?.signal).toBeInstanceOf(AbortSignal);
		expect(JSON.parse(init?.body as string)).toEqual({
			ref: "main",
			inputs: {
				operation: "publish",
				revision: job.revision,
				target: "staging",
				source_digest: job.sourceDigest,
				renderer_source_id: job.rendererSourceId,
			},
		});
		expect(String(init?.body)).not.toContain(configured.PUBLICATION_GITHUB_TOKEN);
	});
	it.each([
		{ targetId: "production" },
		{ rendererSourceId: "c".repeat(40) },
		{ revision: "../another" },
		{ sourceDigest: "invalid" },
	])("rejects job drift before any network request %j", async (changes) => {
		const transport = vi.fn<typeof fetch>();
		await expect(
			dispatchPublication(configured, { ...job, ...changes }, transport),
		).rejects.toThrow("not configured");
		expect(transport).not.toHaveBeenCalled();
	});
	it("never calls a runner when publication is disabled", async () => {
		const transport = vi.fn<typeof fetch>();
		await expect(dispatchPublication({}, job, transport)).rejects.toThrow("not configured");
		expect(transport).not.toHaveBeenCalled();
	});
	it.each([200, 302, 401, 429, 500])("sanitizes provider failure %s", async (status) => {
		const transport = vi
			.fn<typeof fetch>()
			.mockResolvedValue(new Response("provider-secret-payload", { status }));
		await expect(dispatchPublication(configured, job, transport)).rejects.toThrow(
			/^Publication runner could not be started$/,
		);
	});
	it("sanitizes network failures", async () => {
		const transport = vi.fn<typeof fetch>().mockRejectedValue(new Error("token-in-provider-error"));
		await expect(dispatchPublication(configured, job, transport)).rejects.toThrow(
			/^Publication runner could not be started$/,
		);
	});
});

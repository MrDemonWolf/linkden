// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";
import { assertSplitAliasClosure } from "../split-alias-guard.ts";

const accountId = "a".repeat(32);
const token = "private-test-token";
const options = {
	mode: "split" as const,
	isDeploy: true,
	stage: "prod",
	phase: "before" as const,
	env: { CLOUDFLARE_ACCOUNT_ID: accountId, CLOUDFLARE_API_TOKEN: token },
};
const closed = () =>
	Response.json({ success: true, errors: [], result: { enabled: false, previews_enabled: false } });
const fetcher = () => vi.fn<typeof fetch>().mockImplementation(async () => closed());

afterEach(() => vi.useRealTimers());

describe("split alias closure guard", () => {
	it("performs no cloud reads for legacy, local dev or destroy", async () => {
		const read = fetcher();
		await assertSplitAliasClosure({ ...options, mode: "legacy", env: {} }, read);
		await assertSplitAliasClosure({ ...options, isDeploy: false, env: {} }, read);
		expect(read).not.toHaveBeenCalled();
	});

	it("checks only both fixed scripts on the configured Cloudflare account with read-only, nonredirecting requests", async () => {
		const read = fetcher();
		await assertSplitAliasClosure(options, read);
		expect(read.mock.calls.map(([url]) => url)).toEqual([
			`https://api.cloudflare.com/client/v4/accounts/${accountId}/workers/scripts/linkden-api/subdomain`,
			`https://api.cloudflare.com/client/v4/accounts/${accountId}/workers/scripts/linkden/subdomain`,
		]);
		for (const [, init] of read.mock.calls)
			expect(init).toEqual({
				method: "GET",
				headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
				redirect: "error",
				signal: expect.any(AbortSignal),
			});
	});

	it("derives the same stage suffix for both workers", async () => {
		const read = fetcher();
		await assertSplitAliasClosure({ ...options, stage: "staging-1" }, read);
		expect(read.mock.calls.map(([url]) => String(url).split("/scripts/")[1])).toEqual([
			"linkden-api-staging-1/subdomain",
			"linkden-staging-1/subdomain",
		]);
	});

	it.each([
		{ env: {} },
		{ env: { ...options.env, CLOUDFLARE_ACCOUNT_ID: "../another-account" } },
		{ env: { ...options.env, CLOUDFLARE_ACCOUNT_ID: " a".repeat(16) } },
		{ env: { ...options.env, CLOUDFLARE_API_TOKEN: "" } },
		{ env: { ...options.env, CLOUDFLARE_API_TOKEN: "token\nInjected: value" } },
		{ stage: "../foreign?query" },
	])("rejects unsafe configuration before any request: %s", async (invalid) => {
		const read = fetcher();
		await expect(assertSplitAliasClosure({ ...options, ...invalid }, read)).rejects.toThrow(
			"requires a valid account ID",
		);
		expect(read).not.toHaveBeenCalled();
	});

	it.each([
		{ enabled: true, previews_enabled: false },
		{ enabled: false, previews_enabled: true },
		{ enabled: false },
		{ enabled: "false", previews_enabled: false },
		{ enabled: false, previews_enabled: "false" },
		{ enabled: 0, previews_enabled: 0 },
		null,
	])("requires explicit false booleans for each alias: %s", async (result) => {
		const read = fetcher().mockImplementation(async () =>
			Response.json({ success: true, errors: [], result }),
		);
		await expect(assertSplitAliasClosure(options, read)).rejects.toThrow(
			"Split deployment blocked",
		);
	});

	it("fails when either worker is open and names only its role", async () => {
		const read = fetcher().mockImplementation(async (url) =>
			String(url).includes("/linkden-api/")
				? closed()
				: Response.json({
						success: true,
						errors: [],
						result: { enabled: false, previews_enabled: true },
					}),
		);
		await expect(assertSplitAliasClosure(options, read)).rejects.toThrow(
			"Admin workers.dev or preview aliases remain open",
		);
	});

	it("allows missing first-setup scripts only before apply", async () => {
		const read = fetcher().mockImplementation(async () => new Response(null, { status: 404 }));
		await expect(assertSplitAliasClosure(options, read)).resolves.toBeUndefined();
		await expect(assertSplitAliasClosure({ ...options, phase: "after" }, read)).rejects.toThrow(
			"could not be verified after apply",
		);
	});

	it("requires closed aliases again after apply", async () => {
		await expect(
			assertSplitAliasClosure({ ...options, phase: "after" }, fetcher()),
		).resolves.toBeUndefined();
	});

	it.each([302, 401, 403, 429, 500])(
		"fails closed on HTTP %s without provider error disclosure",
		async (status) => {
			const read = fetcher().mockImplementation(
				async () =>
					new Response(token, { status, headers: { location: "https://untrusted.test/" } }),
			);
			await expect(assertSplitAliasClosure(options, read)).rejects.toThrow(
				"API alias closure could not be verified before apply",
			);
		},
	);

	it.each([
		"not-json",
		JSON.stringify({
			success: false,
			errors: [{ message: token }],
			result: { enabled: false, previews_enabled: false },
		}),
		JSON.stringify({
			success: true,
			errors: [{ message: token }],
			result: { enabled: false, previews_enabled: false },
		}),
		"null",
	])("rejects malformed or unsuccessful envelopes without echoing their body", async (body) => {
		const read = fetcher().mockImplementation(async () => new Response(body));
		await expect(assertSplitAliasClosure(options, read)).rejects.toThrow(
			"API alias closure could not be verified before apply",
		);
	});

	it("sanitizes fetch errors", async () => {
		const read = fetcher().mockRejectedValue(new Error(`authorization: ${token}`));
		await expect(assertSplitAliasClosure(options, read)).rejects.toThrow(
			"API alias closure could not be verified before apply",
		);
	});

	it("caps declared and streamed response bodies", async () => {
		const declared = fetcher().mockImplementation(
			async () => new Response("{}", { headers: { "content-length": String(64 * 1024 + 1) } }),
		);
		await expect(assertSplitAliasClosure(options, declared)).rejects.toThrow(
			"could not be verified",
		);
		const cancel = vi.fn();
		const streamed = fetcher().mockImplementation(
			async () =>
				new Response(
					new ReadableStream({
						start(controller) {
							controller.enqueue(new Uint8Array(64 * 1024 + 1));
						},
						cancel,
					}),
				),
		);
		await expect(assertSplitAliasClosure(options, streamed)).rejects.toThrow(
			"could not be verified",
		);
		expect(cancel).toHaveBeenCalledTimes(2);
	});

	it("bounds a stalled fetch and cancels a response arriving after the deadline", async () => {
		vi.useFakeTimers();
		const resolvers: Array<(response: Response) => void> = [];
		const read = fetcher().mockImplementation(
			() => new Promise((resolve) => resolvers.push(resolve)),
		);
		const result = expect(assertSplitAliasClosure(options, read)).rejects.toThrow("timed out");
		await vi.advanceTimersByTimeAsync(5_000);
		await result;
		const cancel = vi.fn();
		for (const resolve of resolvers) resolve(new Response(new ReadableStream({ cancel })));
		await vi.advanceTimersByTimeAsync(0);
		expect(cancel).toHaveBeenCalledTimes(2);
		expect(read.mock.calls[0]?.[1]?.signal?.aborted).toBe(true);
	});

	it("bounds and cancels a stalled response body", async () => {
		vi.useFakeTimers();
		const cancel = vi.fn();
		const read = fetcher().mockImplementation(
			async () => new Response(new ReadableStream({ cancel })),
		);
		const result = expect(assertSplitAliasClosure(options, read)).rejects.toThrow("timed out");
		await vi.advanceTimersByTimeAsync(5_000);
		await result;
		expect(cancel).toHaveBeenCalledTimes(2);
	});
});

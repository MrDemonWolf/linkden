// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import { cloudflarePublicationClient } from "../cloudflare";

const account = "a".repeat(32);
const database = "11111111-1111-4111-8111-111111111111";
const version = "22222222-2222-4222-8222-222222222222";
const deployment = "33333333-3333-4333-8333-333333333333";
const token = "PRIVATE_TEST_API_TOKEN";
const approvedKey = "avatar/11111111-1111-4111-8111-111111111111.png";
const configuration = () => ({
	accountId: account,
	databaseId: database,
	workerName: "linkden-public-staging",
	publicOrigin: "https://staging.example.test",
	apiToken: token,
	imagesBucket: "approved-images",
});
const statement = {
	sql: "SELECT revision FROM publication_revision WHERE revision = ?1",
	params: ["revision-1"],
};
const queryResult = (changes = 0) => ({
	success: true,
	results: [{ revision: "revision-1" }],
	meta: { changes },
});

function fixture(overrides: Partial<ReturnType<typeof configuration>> = {}) {
	const config = { ...configuration(), ...overrides };
	const replies = {
		settings: {
			success: true,
			result: {
				bindings: [] as { type: string }[],
				annotations: { "workers/tag": `${config.workerName}:bootstrap` },
				cache_options: { enabled: false },
				exports: {} as Record<string, unknown>,
			},
		},
		subdomain: { success: true, result: { enabled: false, previews_enabled: false } },
		accountSubdomain: { success: true, result: { subdomain: "approved-account" } },
		deployment: {
			success: true,
			result: {
				id: deployment,
				strategy: "percentage",
				versions: [{ version_id: version, percentage: 100 }],
			},
		},
		d1: { success: true, result: [queryResult(1)] },
	};
	const transport = vi.fn(async (input: RequestInfo | URL, _init?: RequestInit) => {
		const url = new URL(String(input));
		if (url.pathname.endsWith("/settings")) return Response.json(replies.settings);
		if (url.pathname.endsWith(`/workers/scripts/${config.workerName}/subdomain`))
			return Response.json(replies.subdomain);
		if (url.pathname.endsWith("/workers/subdomain")) return Response.json(replies.accountSubdomain);
		if (url.pathname.endsWith("/deployments")) return Response.json(replies.deployment);
		if (url.pathname.endsWith("/query")) return Response.json(replies.d1);
		throw new Error("Unexpected test endpoint");
	});
	return { config, replies, transport, client: cloudflarePublicationClient(config, transport) };
}

describe("fixed Cloudflare publication transport", () => {
	it("sends documented parameterized single and batch D1 envelopes to the fixed account/database endpoint", async () => {
		const h = fixture();
		expect(await h.client.database.query(statement)).toEqual({
			rows: [{ revision: "revision-1" }],
			changes: 1,
		});
		const second = {
			sql: "UPDATE publication_state SET current_revision = ?1 WHERE generation = ?2 AND recovery_revision IS ?3",
			params: ["revision-2", 2, null],
		};
		h.replies.d1.result = [queryResult(1), queryResult(0)];
		expect(await h.client.database.batch([statement, second])).toHaveLength(2);
		for (const [input, init] of h.transport.mock.calls) {
			expect(String(input)).toBe(
				`https://api.cloudflare.com/client/v4/accounts/${account}/d1/database/${database}/query`,
			);
			expect(init).toMatchObject({ method: "POST", redirect: "error" });
			expect(new Headers(init?.headers).get("authorization")).toBe(`Bearer ${token}`);
			expect(new Headers(init?.headers).has("cookie")).toBe(false);
			expect(init?.signal).toBeInstanceOf(AbortSignal);
		}
		expect(JSON.parse(String(h.transport.mock.calls[0]?.[1]?.body))).toEqual(statement);
		expect(JSON.parse(String(h.transport.mock.calls[1]?.[1]?.body))).toEqual({
			batch: [statement, second],
		});
	});

	it("rejects incomplete or failed D1 batch envelopes instead of fabricating success", async () => {
		const h = fixture();
		await expect(h.client.database.batch([statement, statement])).rejects.toThrow(
			"Incomplete publication query result",
		);
		h.replies.d1.result[0]!.success = false;
		await expect(h.client.database.query(statement)).rejects.toThrow(
			"Cloudflare publication response is invalid",
		);
	});

	it.each([
		{ statements: [] },
		{ statements: Array.from({ length: 11 }, () => statement) },
		{ statements: [{ ...statement, sql: "x".repeat(100_001) }] },
		{ statements: [{ ...statement, params: Array.from({ length: 101 }, () => "a") }] },
	])("rejects invalid query batches before network access", async ({ statements }) => {
		const h = fixture();
		await expect(h.client.database.batch(statements)).rejects.toThrow(
			"Invalid publication query batch",
		);
		expect(h.transport).not.toHaveBeenCalled();
	});

	it("bounds serialized query requests before sending them", async () => {
		const h = fixture();
		await expect(
			h.client.database.batch(
				Array.from({ length: 3 }, () => ({ sql: "SELECT ?1", params: ["x".repeat(800_000)] })),
			),
		).rejects.toThrow("Cloudflare publication request failed");
		expect(h.transport).not.toHaveBeenCalled();
	});

	it.each(["network", "http", "json", "schema", "oversized"])(
		"returns a bounded sanitized %s error without provider body or credentials",
		async (cause) => {
			const cancel = vi.fn();
			const transport = vi.fn(async () => {
				if (cause === "network") throw new Error(`PRIVATE_PROVIDER_BODY ${token}`);
				if (cause === "http")
					return new Response(`PRIVATE_PROVIDER_BODY ${token}`, { status: 403 });
				if (cause === "json") return new Response(`PRIVATE_PROVIDER_BODY ${token}`);
				if (cause === "schema")
					return Response.json({
						success: false,
						errors: [{ message: `PRIVATE_PROVIDER_BODY ${token}` }],
					});
				return new Response(new ReadableStream({ cancel }), {
					headers: { "content-length": String(4 * 1024 * 1024 + 1) },
				});
			});
			const client = cloudflarePublicationClient(configuration(), transport);
			const error = await client.database.query(statement).catch((error: unknown) => error);
			expect(error).toBeInstanceOf(Error);
			expect((error as Error).message.length).toBeLessThan(100);
			expect((error as Error).message).not.toContain("PRIVATE_");
			if (cause === "oversized") expect(cancel).toHaveBeenCalled();
		},
	);
});

describe("approved publication target and receipts", () => {
	it.each([
		{ accountId: "../different-account" },
		{ databaseId: "../different-database" },
		{ workerName: "existing-admin-worker" },
		{ workerName: "linkden-public-staging/other" },
		{ publicOrigin: "http://staging.example.test" },
		{ publicOrigin: "https://user:password@staging.example.test" },
		{ publicOrigin: "https://staging.example.test/path" },
		{ publicOrigin: "https://staging.example.test?query=1" },
		{ publicOrigin: "https://staging.example.test#fragment" },
		{ publicOrigin: " https://staging.example.test" },
		{ apiToken: "" },
		{ apiToken: " \t" },
		{ apiToken: "secret\r\nInjected: yes" },
		{ imagesBucket: "ABucket" },
		{ imagesBucket: "a/bucket" },
		{ imagesBucket: "ab" },
		{ imagesBucket: "a".repeat(65) },
	])("rejects unsafe configured identity before network access", (override) => {
		const transport = vi.fn();
		expect(() =>
			cloudflarePublicationClient({ ...configuration(), ...override }, transport),
		).toThrow();
		expect(transport).not.toHaveBeenCalled();
	});

	it("requires a successful target preflight before activation and retains both distinct provider identifiers", async () => {
		const h = fixture();
		await expect(h.client.activate(version)).rejects.toThrow(
			"Verify the approved publication target",
		);
		expect(h.transport).not.toHaveBeenCalled();
		await h.client.verifyTarget();
		expect(await h.client.activate(version)).toEqual({
			deploymentId: deployment,
			providerVersionId: version,
		});
		const [url, init] = h.transport.mock.calls.at(-1)!;
		expect(String(url)).toBe(
			`https://api.cloudflare.com/client/v4/accounts/${account}/workers/scripts/linkden-public-staging/deployments`,
		);
		expect(JSON.parse(String(init?.body))).toEqual({
			strategy: "percentage",
			versions: [{ version_id: version, percentage: 100 }],
		});
		expect(
			h.transport.mock.calls.every(([, request]) =>
				["GET", "POST"].includes(request?.method ?? ""),
			),
		).toBe(true);
	});

	it.each(["binding", "missing-bindings", "ownership", "global-cache", "entrypoint-cache"])(
		"refuses %s target configuration and leaves activation locked",
		async (cause) => {
			const h = fixture();
			if (cause === "binding") h.replies.settings.result.bindings = [{ type: "d1" }];
			if (cause === "missing-bindings")
				Reflect.deleteProperty(h.replies.settings.result, "bindings");
			if (cause === "ownership")
				h.replies.settings.result.annotations["workers/tag"] = "unrelated-app:version";
			if (cause === "global-cache") h.replies.settings.result.cache_options.enabled = true;
			if (cause === "entrypoint-cache")
				h.replies.settings.result.exports = {
					default: { type: "worker", cache: { enabled: true } },
				};
			await expect(h.client.verifyTarget()).rejects.toThrow();
			const calls = h.transport.mock.calls.length;
			await expect(h.client.activate(version)).rejects.toThrow(
				"Verify the approved publication target",
			);
			expect(h.transport).toHaveBeenCalledTimes(calls);
		},
	);

	it("invalidates a previous successful preflight if a later target check fails", async () => {
		const h = fixture();
		await h.client.verifyTarget();
		h.replies.settings.result.bindings = [{ type: "r2_bucket" }];
		await expect(h.client.verifyTarget()).rejects.toThrow();
		await expect(h.client.activate(version)).rejects.toThrow(
			"Verify the approved publication target",
		);
	});

	it("allows only the exact approved Workers.dev staging alias with previews disabled", async () => {
		const h = fixture({
			publicOrigin: "https://linkden-public-staging.approved-account.workers.dev",
		});
		h.replies.subdomain.result.enabled = true;
		await expect(h.client.verifyTarget()).resolves.toBeUndefined();
		expect(h.transport.mock.calls).toHaveLength(3);
		h.replies.subdomain.result.previews_enabled = true;
		await expect(h.client.verifyTarget()).rejects.toThrow("alternate hostnames");
	});

	it.each(["wrong-account", "production-alias", "disabled-alias"])(
		"rejects the %s Workers.dev alias",
		async (cause) => {
			const workerName =
				cause === "production-alias" ? "linkden-public-production" : "linkden-public-staging";
			const subdomain = cause === "wrong-account" ? "different-account" : "approved-account";
			const h = fixture({
				workerName,
				publicOrigin: `https://${workerName}.${subdomain}.workers.dev`,
			});
			h.replies.subdomain.result.enabled = cause !== "disabled-alias";
			await expect(h.client.verifyTarget()).rejects.toThrow();
		},
	);

	it.each(["wrong-version", "split-traffic", "missing-versions"])(
		"refuses a %s activation response",
		async (cause) => {
			const h = fixture();
			await h.client.verifyTarget();
			if (cause === "wrong-version") h.replies.deployment.result.versions[0]!.version_id = database;
			if (cause === "split-traffic")
				h.replies.deployment.result.versions = [
					{ version_id: version, percentage: 50 },
					{ version_id: database, percentage: 50 },
				];
			if (cause === "missing-versions")
				Reflect.deleteProperty(h.replies.deployment.result, "versions");
			await expect(h.client.activate(version)).rejects.toThrow();
		},
	);
});

describe("referenced public R2 reads", () => {
	it.each([
		"wallet_logo",
		"wallet_icon",
		"wallet_strip",
		"login_logo",
		"login_background",
		"private",
		"Avatar",
	])("refuses %s keys without a provider read", async (purpose) => {
		const transport = vi.fn();
		const client = cloudflarePublicationClient(configuration(), transport);
		await expect(
			client.readPublicImage(
				`${purpose}/11111111-1111-4111-8111-111111111111.png`,
				new AbortController().signal,
			),
		).rejects.toThrow("approved public image");
		expect(transport).not.toHaveBeenCalled();
	});

	it.each([
		"avatar/../logo/1.png",
		"avatar/%31.png",
		"avatar/1.png?token=secret",
		"avatar/1.png#fragment",
		"avatar/1.svg",
		"/avatar/1.png",
	])("refuses ambiguous key %s without a provider read", async (key) => {
		const transport = vi.fn();
		await expect(
			cloudflarePublicationClient(configuration(), transport).readPublicImage(
				key,
				new AbortController().signal,
			),
		).rejects.toThrow();
		expect(transport).not.toHaveBeenCalled();
	});

	it("reads only the fixed approved object path with literal slashes and streams clean image metadata", async () => {
		const bytes = Uint8Array.from([1, 2, 3]);
		const response = new Response(bytes, {
			headers: {
				"content-type": "image/png",
				"content-length": "3",
				"set-cookie": "provider-cookie=private",
				"x-provider-meta": "PRIVATE",
			},
		});
		Object.defineProperty(response, "url", {
			value: `https://api.cloudflare.com/client/v4/accounts/${account}/r2/buckets/approved-images/objects/${approvedKey}`,
		});
		const transport = vi.fn(async () => response);
		const signal = new AbortController().signal;
		const image = await cloudflarePublicationClient(configuration(), transport).readPublicImage(
			approvedKey,
			signal,
		);
		expect(transport).toHaveBeenCalledWith(
			`https://api.cloudflare.com/client/v4/accounts/${account}/r2/buckets/approved-images/objects/${approvedKey}`,
			expect.objectContaining({
				method: "GET",
				redirect: "error",
				signal,
				headers: { Authorization: `Bearer ${token}` },
			}),
		);
		expect(response.bodyUsed).toBe(false);
		expect(image.url).toBe("");
		expect([...image.headers.keys()].sort()).toEqual(["content-length", "content-type"]);
		expect(new Uint8Array(await image.arrayBuffer())).toEqual(bytes);
	});

	it("requires an explicit bucket, leaves HTTP status to the bounded media caller, and sanitizes network errors", async () => {
		const transport = vi.fn(async () => new Response("missing", { status: 404 }));
		await expect(
			cloudflarePublicationClient(
				{ ...configuration(), imagesBucket: undefined },
				transport,
			).readPublicImage(approvedKey, new AbortController().signal),
		).rejects.toThrow();
		expect(transport).not.toHaveBeenCalled();
		const response = await cloudflarePublicationClient(configuration(), transport).readPublicImage(
			approvedKey,
			new AbortController().signal,
		);
		expect(response.status).toBe(404);
		const unavailable = cloudflarePublicationClient(configuration(), async () => {
			throw new Error(`PRIVATE_PROVIDER_BODY ${token}`);
		});
		await expect(
			unavailable.readPublicImage(approvedKey, new AbortController().signal),
		).rejects.toThrow("Cloudflare public image request failed");
	});
});

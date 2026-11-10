// @vitest-environment node

import { sql } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const getSession = vi.hoisted(() => vi.fn());
const generatePkpass = vi.hoisted(() => vi.fn(async () => new Uint8Array([1, 2, 3])));
vi.mock("../lib/pkpass", () => ({ generatePkpass }));
vi.mock("@linkden/env/server", () => ({ env: { CORS_ORIGIN: "https://admin.example" } }));
// The legacy form runs in packages/api, whose `@linkden/env/server` import can resolve through a
// different link under CI's isolated installs and escape the mock above. Its source module,
// `cloudflare:workers`, is aliased to one stub file, so mock that too.
vi.mock("cloudflare:workers", () => ({ env: { CORS_ORIGIN: "https://admin.example" } }));
vi.mock("@linkden/auth", () => ({
	auth: { api: { getSession }, handler: vi.fn() },
	authConfigProblem: null,
	getSessionQuery: () => ({}),
}));
vi.mock("@linkden/db", async () => {
	const { createTestDb } = await import("@linkden/db/testing");
	const { db } = await createTestDb();
	return { db };
});
const { db } = await import("@linkden/db");
const { contactQuota, contactSubmission, siteSettings } = await import("@linkden/db/schema/index");
const { appRouter } = await import("@linkden/api/routers/index");
const { CONTACT_DAILY_LIMIT } = await import("@linkden/api/utils/contact-quota");
const worker = (await import("../index")).default;
const fields = {
	firstName: "Ada",
	lastName: "Lovelace",
	email: "ada@example.com",
	message: "Hello",
	captchaToken: "captcha",
	consent: true as const,
};
const fetchMock = vi.fn();
const limiter = { limit: vi.fn(async () => ({ success: true })) };

function call(
	body: unknown = fields,
	headers: Record<string, string> = {},
	bindings: Record<string, unknown> = {},
	method = "POST",
	url = "https://api.example/api/contact?ignored=never-log-token",
) {
	return worker.fetch(
		new Request(url, {
			method,
			headers: { origin: "https://public.example", "content-type": "application/json", ...headers },
			...(method === "POST" ? { body: JSON.stringify(body) } : {}),
		}),
		{
			CORS_ORIGIN: "https://admin.example",
			PUBLIC_SITE_URL: "https://public.example",
			RL_AUTH: limiter,
			...bindings,
		} as never,
		{
			waitUntil: vi.fn(),
			passThroughOnException: vi.fn(),
			props: {},
		} as unknown as ExecutionContext,
	);
}

async function setting(key: string, value: string) {
	await db
		.insert(siteSettings)
		.values({ key, value })
		.onConflictDoUpdate({ target: siteSettings.key, set: { value } });
}

beforeEach(async () => {
	await db.delete(contactQuota);
	await db.delete(contactSubmission);
	await db.delete(siteSettings);
	await setting("contact_form_enabled", "true");
	await setting("captcha_provider", "turnstile");
	await setting("captcha_secret_key", "private-captcha-secret");
	getSession.mockReset();
	generatePkpass.mockClear();
	limiter.limit.mockReset().mockResolvedValue({ success: true });
	fetchMock.mockReset().mockResolvedValue({
		ok: true,
		json: async () => ({ success: true, hostname: "public.example", action: "contact" }),
	});
	vi.stubGlobal("fetch", fetchMock);
	vi.spyOn(console, "log").mockImplementation(() => {});
	vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("opt-in split public contact ingress", () => {
	const endpoint = "https://public.example/api/contact";
	const split = { LINKDEN_SERVING_MODE: "split", PUBLIC_CONTACT_URL: endpoint };
	it("supports the brief's separate public API hostname with profile-only CORS and CAPTCHA delivery", async () => {
		const apiEndpoint = "https://api.example.com/api/contact";
		const configured = { ...split, PUBLIC_CONTACT_URL: apiEndpoint };
		const preflight = await call(
			undefined,
			{ "access-control-request-method": "POST", "access-control-request-headers": "content-type" },
			configured,
			"OPTIONS",
			apiEndpoint,
		);
		expect(preflight.status).toBe(204);
		expect(preflight.headers.get("access-control-allow-origin")).toBe("https://public.example");
		expect(preflight.headers.get("access-control-allow-credentials")).toBeNull();
		expect(limiter.limit).not.toHaveBeenCalled();
		const delivered = await call(fields, {}, configured, "POST", apiEndpoint);
		expect(delivered.status).toBe(200);
		expect(await delivered.json()).toEqual({ success: true });
		expect(delivered.headers.get("access-control-allow-origin")).toBe("https://public.example");
		expect(delivered.headers.get("access-control-allow-credentials")).toBeNull();
		expect(
			(await call(fields, { origin: "https://api.example.com" }, configured, "POST", apiEndpoint))
				.status,
		).toBe(403);
		expect((await call(fields, {}, configured, "POST", endpoint)).status).toBe(404);
		expect(fetchMock).toHaveBeenCalledTimes(1);
		expect(getSession).not.toHaveBeenCalled();
		expect(await db.select().from(contactSubmission)).toHaveLength(1);
		expect(await db.select().from(contactQuota)).toMatchObject([{ reserved: 1 }]);
	});
	it("serves the exact credential-free POST and its narrow preflight through the existing handler", async () => {
		const preflight = await call(
			undefined,
			{ "access-control-request-method": "POST", "access-control-request-headers": "content-type" },
			split,
			"OPTIONS",
			endpoint,
		);
		expect(preflight.status).toBe(204);
		expect(preflight.headers.get("access-control-allow-origin")).toBe("https://public.example");
		expect(preflight.headers.get("access-control-allow-credentials")).toBeNull();
		expect(limiter.limit).not.toHaveBeenCalled();
		const response = await call(
			fields,
			{ "cf-connecting-ip": "203.0.113.8" },
			split,
			"POST",
			endpoint,
		);
		expect(response.status).toBe(200);
		expect(await response.json()).toEqual({ success: true });
		expect(response.headers.get("cache-control")).toBe("no-store");
		expect(limiter.limit).toHaveBeenCalledTimes(1);
		expect(fetchMock).toHaveBeenCalledTimes(1);
		expect(getSession).not.toHaveBeenCalled();
		expect(await db.select().from(contactQuota)).toMatchObject([{ reserved: 1 }]);
	});

	it("blocks every other public API path before auth, data, storage or CAPTCHA work", async () => {
		const select = vi.spyOn(db, "select");
		const batch = vi.spyOn(db, "batch");
		const get = vi.fn();
		for (const path of [
			"/trpc/settings.getAll",
			"/trpc/public.getPage",
			"/api/auth/get-session",
			"/api/images/avatar/a.png",
			"/api/admin/wallet-pass",
			"/api/vcard",
			"/api/upload",
			"/api/health",
			"/api/contact/extra",
			"/api/contact?ignored=1",
			"/api/%63ontact",
		])
			for (const method of ["GET", "POST", "OPTIONS"])
				expect(
					(
						await call(
							fields,
							{ cookie: "admin-session=private", "x-forwarded-host": "api.internal" },
							{ ...split, IMAGES_BUCKET: { get } },
							method,
							`https://public.example${path}`,
						)
					).status,
				).toBe(404);
		for (const method of ["GET", "HEAD", "DELETE"])
			expect((await call(undefined, {}, split, method, endpoint)).status).toBe(404);
		expect(select).not.toHaveBeenCalled();
		expect(batch).not.toHaveBeenCalled();
		expect(get).not.toHaveBeenCalled();
		expect(getSession).not.toHaveBeenCalled();
		expect(fetchMock).not.toHaveBeenCalled();
		expect(limiter.limit).not.toHaveBeenCalled();
	});

	it("keeps private service-binding health available while absent or malformed public setup stays closed", async () => {
		expect(
			(
				await call(
					undefined,
					{},
					{ ...split, PUBLIC_CONTACT_URL: undefined },
					"GET",
					"https://api.internal/api/health",
				)
			).status,
		).toBe(200);
		expect(
			(await call(fields, {}, { ...split, PUBLIC_CONTACT_URL: undefined }, "POST", endpoint))
				.status,
		).toBe(404);
		expect(
			(
				await call(
					fields,
					{},
					{ ...split, PUBLIC_CONTACT_URL: "https://admin.example/api/contact" },
					"POST",
					endpoint,
				)
			).status,
		).toBe(503);
		expect(
			(await call(fields, {}, { ...split, LINKDEN_SERVING_MODE: "Split" }, "POST", endpoint))
				.status,
		).toBe(503);
		expect(getSession).not.toHaveBeenCalled();
	});

	it("preserves origin, credential, body, CAPTCHA, per-client and daily quota rejection", async () => {
		const rejectedHeaders: Record<string, string>[] = [
			{ origin: "https://admin.example" },
			{ cookie: "private" },
			{ authorization: "Bearer private" },
		];
		for (const headers of rejectedHeaders)
			expect((await call(fields, headers, split, "POST", endpoint)).status).toBe(403);
		expect(
			(await call({ ...fields, message: "x".repeat(70_000) }, {}, split, "POST", endpoint)).status,
		).toBe(413);
		fetchMock.mockResolvedValueOnce({
			ok: true,
			json: async () => ({ success: true, hostname: "admin.example", action: "contact" }),
		});
		expect((await call(fields, {}, split, "POST", endpoint)).status).toBe(400);
		limiter.limit.mockResolvedValueOnce({ success: false });
		expect((await call(fields, {}, split, "POST", endpoint)).status).toBe(429);
		await db.insert(contactQuota).values({
			id: "site",
			day: new Date().toISOString().slice(0, 10),
			reserved: CONTACT_DAILY_LIMIT,
		});
		expect((await call(fields, {}, split, "POST", endpoint)).status).toBe(429);
		expect(await db.select().from(contactSubmission)).toEqual([]);
		expect(getSession).not.toHaveBeenCalled();
	});
});
afterEach(() => {
	vi.unstubAllGlobals();
	vi.restoreAllMocks();
});

describe("dedicated public contact endpoint", () => {
	it("accepts a credential-free form without auth probes and verifies the public hostname", async () => {
		const response = await call(fields, { "cf-connecting-ip": "203.0.113.7" });
		expect(response.status).toBe(200);
		expect(await response.json()).toEqual({ success: true });
		expect(response.headers.get("access-control-allow-origin")).toBe("https://public.example");
		expect(response.headers.get("access-control-allow-credentials")).toBeNull();
		expect(response.headers.get("cache-control")).toBe("no-store");
		expect(getSession).not.toHaveBeenCalled();
		expect(await db.select().from(contactSubmission)).toHaveLength(1);
		expect(await db.select().from(contactQuota)).toMatchObject([{ reserved: 1 }]);
		const sent = fetchMock.mock.calls[0]?.[1];
		expect(String(sent?.body)).toContain("remoteip=203.0.113.7");
		expect(JSON.stringify(sent?.headers)).not.toContain("cookie");
	});

	it("rejects absent/wrong origins, account credentials and missing explicit setup", async () => {
		const blockedHeaders: Record<string, string>[] = [
			{ origin: "" },
			{ origin: "https://admin.example" },
			{ cookie: "admin-session=private" },
			{ authorization: "Bearer private" },
		];
		for (const headers of blockedHeaders) {
			expect((await call(fields, headers)).status).toBe(403);
		}
		expect((await call(fields, {}, { PUBLIC_SITE_URL: "" })).status).toBe(503);
		expect(
			(await call(fields, {}, { PUBLIC_SITE_URL: "https://public.example/path" })).status,
		).toBe(503);
		expect(await db.select().from(contactQuota)).toEqual([]);
		expect(fetchMock).not.toHaveBeenCalled();
		expect(getSession).not.toHaveBeenCalled();
	});

	it("allows only the dedicated non-credentialed preflight", async () => {
		const response = await call(
			undefined,
			{ "access-control-request-method": "POST", "access-control-request-headers": "content-type" },
			{},
			"OPTIONS",
		);
		expect(response.status).toBe(204);
		expect(response.headers.get("access-control-allow-credentials")).toBeNull();
		expect(
			(
				await call(
					undefined,
					{
						"access-control-request-method": "POST",
						"access-control-request-headers": "authorization",
					},
					{},
					"OPTIONS",
				)
			).status,
		).toBe(403);
		expect((await call(undefined, {}, {}, "GET")).status).toBe(405);
		expect(limiter.limit).not.toHaveBeenCalled();
	});

	it("caps and validates JSON and keeps rejected bodies out of error responses", async () => {
		expect((await call({ ...fields, pad: "secret".repeat(12000) })).status).toBe(413);
		expect((await call({ ...fields, consent: false })).status).toBe(400);
		expect((await call(fields, { "content-type": "text/plain" })).status).toBe(415);
		expect(await db.select().from(contactQuota)).toEqual([]);
		expect(fetchMock).not.toHaveBeenCalled();
	});

	it("counts contact bytes despite an understated Content-Length before quota or delivery work", async () => {
		const response = await call({ ...fields, pad: "x".repeat(70_000) }, { "content-length": "1" });
		expect(response.status).toBe(413);
		expect(await db.select().from(contactQuota)).toEqual([]);
		expect(fetchMock).not.toHaveBeenCalled();
		expect(limiter.limit).not.toHaveBeenCalled();
	});

	it("requires configured CAPTCHA, enforces its hostname and retains the per-client limiter", async () => {
		await setting("captcha_provider", "none");
		expect((await call()).status).toBe(503);
		await setting("captcha_provider", "turnstile");
		fetchMock.mockResolvedValueOnce({
			ok: true,
			json: async () => ({ success: true, hostname: "admin.example", action: "contact" }),
		});
		expect((await call()).status).toBe(400);
		limiter.limit.mockResolvedValueOnce({ success: false });
		expect((await call()).status).toBe(429);
		expect(await db.select().from(contactQuota)).toEqual([]);
	});

	it("shares the atomic daily budget with the legacy form", async () => {
		const day = new Date().toISOString().slice(0, 10);
		await db.insert(contactQuota).values({ id: "site", day, reserved: CONTACT_DAILY_LIMIT - 1 });
		const responses = await Promise.all([call(), call()]);
		expect(responses.map((response) => response.status).sort()).toEqual([200, 429]);
		expect(await db.select().from(contactSubmission)).toHaveLength(1);
		const caller = appRouter.createCaller({ session: null, headers: new Headers() });
		fetchMock.mockResolvedValueOnce({
			ok: true,
			json: async () => ({ success: true, hostname: "admin.example", action: "contact" }),
		});
		await expect(caller.public.submitContact(fields)).rejects.toMatchObject({
			code: "TOO_MANY_REQUESTS",
		});
		expect(await db.select().from(contactQuota)).toMatchObject([{ reserved: CONTACT_DAILY_LIMIT }]);
	});

	it("conservatively keeps a reservation after storage failure without leaking request data", async () => {
		await db.run(
			sql`CREATE TRIGGER fail_contact_test BEFORE INSERT ON contact_submission BEGIN SELECT RAISE(ABORT, 'private-storage-payload'); END`,
		);
		try {
			const response = await call();
			expect(response.status).toBe(503);
			expect(await response.json()).toEqual({
				error: "Contact service is unavailable. Please try again later.",
			});
			expect(await db.select().from(contactSubmission)).toEqual([]);
			expect(await db.select().from(contactQuota)).toMatchObject([{ reserved: 1 }]);
			const logs = JSON.stringify([
				vi.mocked(console.log).mock.calls,
				vi.mocked(console.error).mock.calls,
			]);
			for (const secret of [
				fields.email,
				fields.message,
				fields.captchaToken,
				"private-captcha-secret",
				"private-storage-payload",
				"never-log-token",
			])
				expect(logs).not.toContain(secret);
		} finally {
			await db.run(sql`DROP TRIGGER fail_contact_test`);
		}
	});
});

describe("private Wallet public profile URL", () => {
	it("prefers the explicit public origin and fails closed on malformed configuration", async () => {
		getSession.mockResolvedValue({ user: { id: "admin" } });
		await db.insert(siteSettings).values([
			{ key: "wallet_pass_enabled", value: "true" },
			{ key: "wallet_show_qr_code", value: "true" },
		]);
		const callWallet = (publicSiteUrl?: string) =>
			worker.fetch(
				new Request("https://admin.example/api/admin/wallet-pass"),
				{
					CORS_ORIGIN: "https://admin.example",
					...(publicSiteUrl === undefined ? {} : { PUBLIC_SITE_URL: publicSiteUrl }),
					WALLET_SIGNER_CERT: "test-cert",
					WALLET_SIGNER_KEY: "test-key",
					WALLET_WWDR_CERT: "test-wwdr",
					WALLET_TEAM_ID: "test-team",
					WALLET_PASS_TYPE_ID: "pass.example",
				} as never,
				{
					waitUntil: vi.fn(),
					passThroughOnException: vi.fn(),
					props: {},
				} as unknown as ExecutionContext,
			);
		expect((await callWallet("https://public.example/")).status).toBe(200);
		expect(generatePkpass).toHaveBeenLastCalledWith(
			expect.objectContaining({ barcodeMessage: "https://public.example" }),
			expect.anything(),
		);
		expect((await callWallet()).status).toBe(200);
		expect(generatePkpass).toHaveBeenLastCalledWith(
			expect.objectContaining({ barcodeMessage: "https://admin.example" }),
			expect.anything(),
		);
		generatePkpass.mockClear();
		for (const invalid of [
			"https://public.example/path",
			"javascript:alert(1)",
			"https://user:secret@public.example",
			"",
		])
			expect((await callWallet(invalid)).status).toBe(503);
		expect(generatePkpass).not.toHaveBeenCalled();
	});
});

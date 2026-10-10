// @vitest-environment node
// Route-level tests for the real Worker entry (src/index.ts): middleware order,
// gates, limiters, origin/body guards, upload, image serving, downloads, cron.
// Workers-only modules are mocked; the DB is the in-memory libsql test DB.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const ORIGIN = "https://links.example.com";

const { getSession, authHandler, authState } = vi.hoisted(() => ({
	getSession: vi.fn(),
	authHandler: vi.fn(async (_req: Request) => new Response("auth ok")),
	/** Stands in for @linkden/auth's module-level authConfigProblem. */
	authState: { problem: null as string | null },
}));

vi.mock("@linkden/env/server", () => ({ env: { CORS_ORIGIN: "https://links.example.com" } }));
vi.mock("@linkden/db", async () => {
	const { createTestDb } = await import("@linkden/db/testing");
	const { db } = await createTestDb();
	return { db };
});
vi.mock("@linkden/auth", () => ({
	auth: { api: { getSession }, handler: authHandler },
	get authConfigProblem() {
		return authState.problem;
	},
	getSessionQuery: () => ({}),
}));

const { db } = await import("@linkden/db");
const { block, siteSettings, user } = await import("@linkden/db/schema/index");
const worker = (await import("../index")).default;

// ─── Fakes ───────────────────────────────────────────────────────────────────
const limiter = (success = true) => ({
	limit: vi.fn(async (_o: { key: string }) => ({ success })),
});

function fakeBucket() {
	const store = new Map<string, { body: Uint8Array; contentType?: string }>();
	return {
		store,
		put: vi.fn(
			async (key: string, value: unknown, opts?: { httpMetadata?: { contentType?: string } }) => {
				const body = new Uint8Array(await new Response(value as BodyInit).arrayBuffer());
				store.set(key, { body, contentType: opts?.httpMetadata?.contentType });
			},
		),
		get: vi.fn(async (key: string) => {
			const o = store.get(key);
			if (!o) return null;
			return {
				body: o.body,
				httpEtag: '"etag-1"',
				httpMetadata: { contentType: o.contentType },
				arrayBuffer: async () => o.body.buffer,
			};
		}),
		delete: vi.fn(async (_key: string | string[]) => {}),
		list: vi.fn(async () => ({ objects: [], truncated: false })),
	};
}

let bucket: ReturnType<typeof fakeBucket>;
const ctx = { waitUntil: vi.fn(), passThroughOnException: vi.fn(), props: {} };

function envWith(overrides: Record<string, unknown> = {}) {
	return { CORS_ORIGIN: ORIGIN, IMAGES_BUCKET: bucket, ...overrides };
}

function call(path: string, init: RequestInit = {}, env: Record<string, unknown> = envWith()) {
	return worker.fetch(
		new Request(`${ORIGIN}${path}`, init),
		env as never,
		ctx as unknown as ExecutionContext,
	);
}

const post = (body: unknown, headers: Record<string, string> = {}): RequestInit => ({
	method: "POST",
	headers: { "content-type": "application/json", origin: ORIGIN, ...headers },
	body: JSON.stringify(body),
});

const setSetting = (key: string, value: string) =>
	db
		.insert(siteSettings)
		.values({ key, value })
		.onConflictDoUpdate({ target: siteSettings.key, set: { value } });

const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13, 0, 0]);
const HTML = new TextEncoder().encode("<!DOCTYPE html><script>alert(1)</script>");
const UUID = "123e4567-e89b-42d3-a456-426614174000";
const OTHER_UUID = "9b2f1c3e-4d5a-4b6c-8d7e-0f1a2b3c4d5e";

/** A multipart upload request with an explicit Content-Length, like browsers send. */
async function uploadInit(
	file: { bytes: Uint8Array; name: string; type: string },
	fields: Record<string, string> = { purpose: "avatar" },
	headers: Record<string, string> = { origin: ORIGIN },
): Promise<RequestInit> {
	const fd = new FormData();
	fd.append("file", new File([file.bytes], file.name, { type: file.type }));
	for (const [k, v] of Object.entries(fields)) fd.append(k, v);
	const draft = new Request(ORIGIN, { method: "POST", body: fd });
	const body = await draft.arrayBuffer();
	return {
		method: "POST",
		body,
		headers: {
			"content-type": draft.headers.get("content-type") ?? "",
			"content-length": String(body.byteLength),
			...headers,
		},
	};
}

beforeEach(() => {
	bucket = fakeBucket();
	getSession.mockReset();
	getSession.mockResolvedValue(null);
	authHandler.mockClear();
	ctx.waitUntil.mockClear();
});

afterEach(async () => {
	vi.restoreAllMocks();
	await db.delete(siteSettings);
	await db.delete(block);
	await db.delete(user);
});

// ─── Cross-cutting ───────────────────────────────────────────────────────────
describe("security headers + request log", () => {
	it("sets the security headers", async () => {
		const res = await call("/");
		expect(res.status).toBe(200);
		expect(res.headers.get("x-frame-options")).toBe("DENY");
		expect(res.headers.get("x-content-type-options")).toBe("nosniff");
	});

	it("never logs the query string or the reset-password token", async () => {
		const log = vi.spyOn(console, "log").mockImplementation(() => {});
		await call("/api/auth/reset-password/tok_secret_123?callbackURL=%2Fadmin%2Freset");
		await call("/api/auth/magic-link/verify?token=magic_secret_456");
		const lines = log.mock.calls.map((args) => args.join(" ")).join("\n");
		expect(lines).toContain("GET /api/auth/reset-password/[redacted] 200");
		expect(lines).not.toContain("tok_secret_123");
		expect(lines).not.toContain("magic_secret_456");
		expect(lines).not.toContain("callbackURL");
	});
});

// ─── Auth gates ──────────────────────────────────────────────────────────────
describe("sign-up gate", () => {
	const signUp = (headers: Record<string, string> = {}, env = envWith()) =>
		call("/api/auth/sign-up/email", post({ email: "a@b.co", password: "x" }, headers), env);

	it("passes the first signup through to Better Auth", async () => {
		expect((await signUp()).status).toBe(200);
		expect(authHandler).toHaveBeenCalledOnce();
	});

	it("requires the setup token when SETUP_TOKEN is bound", async () => {
		const env = envWith({ SETUP_TOKEN: "first-run-token" });
		const missing = await signUp({}, env);
		expect(missing.status).toBe(403);
		expect(await missing.json()).toEqual({ error: "Invalid setup token" });
		expect((await signUp({ "x-setup-token": "wrong" }, env)).status).toBe(403);
		expect(authHandler).not.toHaveBeenCalled();
		expect((await signUp({ "x-setup-token": "first-run-token" }, env)).status).toBe(200);
	});

	it("closes registration once a user exists", async () => {
		await db.insert(user).values({ id: "u1", name: "Admin", email: "admin@x.co" });
		const res = await signUp();
		expect(res.status).toBe(403);
		expect(await res.json()).toEqual({ error: "Registration is closed" });
		expect(authHandler).not.toHaveBeenCalled();
	});

	it("spends RL_STRICT budget before the gate", async () => {
		const strict = limiter(false);
		const res = await signUp({}, envWith({ RL_STRICT: strict }));
		expect(res.status).toBe(429);
		expect(strict.limit).toHaveBeenCalledOnce();
	});
});

describe("magic-link gate", () => {
	const send = () => call("/api/auth/sign-in/magic-link", post({ email: "a@b.co" }));
	const verify = () => call("/api/auth/magic-link/verify?token=t");

	it("refuses send and verify when the setting is unset", async () => {
		expect((await send()).status).toBe(403);
		expect((await verify()).status).toBe(403);
		expect(authHandler).not.toHaveBeenCalled();
	});

	it("refuses when the setting is 'false'", async () => {
		await setSetting("magic_link_enabled", "false");
		expect((await send()).status).toBe(403);
	});

	it("passes through when the setting is 'true'", async () => {
		await setSetting("magic_link_enabled", "true");
		expect((await send()).status).toBe(200);
		expect((await verify()).status).toBe(200);
	});
});

// ─── Rate limits ─────────────────────────────────────────────────────────────
describe("rate limits", () => {
	it("keys per IP with IPv6 collapsed to /64, then spends a global sign-in token", async () => {
		const auth = limiter();
		const signin = limiter();
		await call(
			"/api/auth/sign-in/email",
			post({ email: "a@b.co", password: "x" }, { "cf-connecting-ip": "2001:db8:1:2:aaaa::1" }),
			envWith({ RL_AUTH: auth, RL_SIGNIN: signin }),
		);
		expect(auth.limit).toHaveBeenCalledWith({ key: "2001:db8:1:2::/64" });
		expect(signin.limit).toHaveBeenCalledWith({ key: "global:sign-in" });
	});

	it("limits the 2FA verify step", async () => {
		const auth = limiter(false);
		const res = await call(
			"/api/auth/two-factor/verify-totp",
			post({ code: "123456" }),
			envWith({ RL_AUTH: auth }),
		);
		expect(res.status).toBe(429);
		expect(authHandler).not.toHaveBeenCalled();
	});

	it("blocks with 429 and never reaches Better Auth when over the limit", async () => {
		const res = await call(
			"/api/auth/sign-in/email",
			post({}),
			envWith({ RL_AUTH: limiter(false) }),
		);
		expect(res.status).toBe(429);
		expect(authHandler).not.toHaveBeenCalled();
	});

	it("spends one token per limited procedure in a tRPC batch, wherever it sits", async () => {
		const pub = limiter();
		const auth = limiter();
		await call(
			"/trpc/settings.update,public.trackView,public.trackView?batch=1",
			post({ 0: {}, 1: {}, 2: {} }),
			envWith({ RL_PUBLIC: pub, RL_AUTH: auth }),
		);
		expect(pub.limit).toHaveBeenCalledTimes(2);
		expect(auth.limit).not.toHaveBeenCalled();
	});

	it("rejects the whole batch when a limited procedure inside it is over the limit", async () => {
		const res = await call(
			"/trpc/settings.update,public.submitContact?batch=1",
			post({ 0: {}, 1: {} }),
			envWith({ RL_AUTH: limiter(false) }),
		);
		expect(res.status).toBe(429);
	});

	it("rejects batches above the size cap before running anything", async () => {
		const pub = limiter();
		const path = Array.from({ length: 21 }, () => "public.trackView").join(",");
		const res = await call(`/trpc/${path}?batch=1`, post({}), envWith({ RL_PUBLIC: pub }));
		expect(res.status).toBe(400);
		expect(pub.limit).not.toHaveBeenCalled();
	});
});

// ─── Origin + body guards ────────────────────────────────────────────────────
describe("same-origin writes", () => {
	it("blocks a cross-site tRPC mutation", async () => {
		const res = await call(
			"/trpc/danger.resetEverything",
			post({}, { origin: "https://evil.example.com" }),
		);
		expect(res.status).toBe(403);
	});

	it("blocks a same-site sibling that omits Origin", async () => {
		const init = post({});
		const headers = new Headers(init.headers);
		headers.delete("origin");
		headers.set("sec-fetch-site", "same-site");
		const res = await call("/trpc/danger.resetEverything", { ...init, headers });
		expect(res.status).toBe(403);
	});

	it("lets the site origin through (tRPC then enforces auth)", async () => {
		const res = await call("/trpc/danger.resetEverything", post({}));
		expect(res.status).toBe(401);
	});

	it("blocks a cross-site upload before any auth or R2 work", async () => {
		getSession.mockResolvedValue({ user: { id: "u1" } });
		const init = await uploadInit({ bytes: PNG, name: "a.png", type: "image/png" }, undefined, {
			origin: "https://evil.example.com",
		});
		expect((await call("/api/upload", init)).status).toBe(403);
		expect(bucket.put).not.toHaveBeenCalled();
	});
});

describe("body limits", () => {
	it("caps /api/auth bodies", async () => {
		const res = await call("/api/auth/sign-in/email", post({ pad: "x".repeat(70_000) }));
		expect(res.status).toBe(413);
		expect(authHandler).not.toHaveBeenCalled();
	});

	it("caps ordinary tRPC bodies but leaves room for backup import", async () => {
		const big = { pad: "x".repeat(1_100_000) };
		expect((await call("/trpc/settings.update", post(big))).status).toBe(413);
		// Over the general cap, under the backup cap: reaches tRPC (401, no session).
		expect((await call("/trpc/backup.import", post(big))).status).toBe(401);
	});
});

// ─── Upload ──────────────────────────────────────────────────────────────────
describe("POST /api/upload", () => {
	const png = { bytes: PNG, name: "a.png", type: "image/png" };

	it("401s without a session and writes nothing", async () => {
		expect((await call("/api/upload", await uploadInit(png))).status).toBe(401);
		expect(bucket.put).not.toHaveBeenCalled();
	});

	it("enforces Content-Length before buffering", async () => {
		getSession.mockResolvedValue({ user: { id: "u1" } });
		const init = await uploadInit(png);
		const headers = new Headers(init.headers);
		headers.delete("content-length");
		expect((await call("/api/upload", { ...init, headers })).status).toBe(411);
		headers.set("content-length", String(6 * 1024 * 1024));
		expect((await call("/api/upload", { ...init, headers })).status).toBe(413);
		expect(bucket.put).not.toHaveBeenCalled();
	});

	it("rejects bytes that don't match the claimed type", async () => {
		getSession.mockResolvedValue({ user: { id: "u1" } });
		const init = await uploadInit({ bytes: HTML, name: "evil.png", type: "image/png" });
		expect((await call("/api/upload", init)).status).toBe(400);
		expect(bucket.put).not.toHaveBeenCalled();
	});

	it("stores a valid image and returns its public URL", async () => {
		getSession.mockResolvedValue({ user: { id: "u1" } });
		const res = await call("/api/upload", await uploadInit(png));
		expect(res.status).toBe(200);
		const { publicUrl } = (await res.json()) as { publicUrl: string };
		expect(publicUrl).toMatch(/^\/api\/images\/avatar\/[0-9a-f-]{36}\.png$/);
		expect(bucket.put).toHaveBeenCalledOnce();
		expect(bucket.delete).not.toHaveBeenCalled();
	});

	it("deletes an unsaved same-purpose upload named in `replaces`", async () => {
		getSession.mockResolvedValue({ user: { id: "u1" } });
		const replaces = `/api/images/avatar/${UUID}.png`;
		await call("/api/upload", await uploadInit(png, { purpose: "avatar", replaces }));
		expect(bucket.delete).toHaveBeenCalledWith(`avatar/${UUID}.png`);
	});

	it("never deletes an object a saved setting or block still references", async () => {
		getSession.mockResolvedValue({ user: { id: "u1" } });
		const live = `/api/images/avatar/${UUID}.png`;
		await setSetting("avatar_url", live);
		await call("/api/upload", await uploadInit(png, { purpose: "avatar", replaces: live }));

		const inBlock = `/api/images/avatar/${OTHER_UUID}.png`;
		await db.insert(block).values({
			id: "b1",
			type: "image",
			position: 0,
			config: JSON.stringify({ src: inBlock }),
		});
		await call("/api/upload", await uploadInit(png, { purpose: "avatar", replaces: inBlock }));

		expect(bucket.delete).not.toHaveBeenCalled();
	});

	it("ignores `replaces` for a different purpose", async () => {
		getSession.mockResolvedValue({ user: { id: "u1" } });
		const replaces = `/api/images/banner/${UUID}.png`;
		await call("/api/upload", await uploadInit(png, { purpose: "avatar", replaces }));
		expect(bucket.delete).not.toHaveBeenCalled();
	});
});

// ─── Image serving ───────────────────────────────────────────────────────────
describe("GET /api/images/*", () => {
	it("404s key shapes the app never writes without touching R2", async () => {
		expect((await call("/api/images/whatever")).status).toBe(404);
		expect((await call("/api/images/avatar/a/b.png")).status).toBe(404);
		expect((await call("/api/images/avatar/x.svg")).status).toBe(404);
		expect(bucket.get).not.toHaveBeenCalled();
	});

	it("rejects traversal", async () => {
		expect((await call("/api/images/avatar/..%2f..%2fsecret.png")).status).toBe(400);
	});

	it("serves stored images with immutable caching and an ETag", async () => {
		bucket.store.set(`avatar/${UUID}.png`, { body: PNG, contentType: "image/png" });
		const res = await call(`/api/images/avatar/${UUID}.png`);
		expect(res.status).toBe(200);
		expect(res.headers.get("content-type")).toBe("image/png");
		expect(res.headers.get("cache-control")).toContain("immutable");
		expect(res.headers.get("etag")).toBe('"etag-1"');
		expect(new Uint8Array(await res.arrayBuffer())).toEqual(PNG);
	});

	it("serves legacy timestamp keys and 404s missing objects", async () => {
		bucket.store.set("avatar/1712345678901.png", { body: PNG, contentType: "image/png" });
		expect((await call("/api/images/avatar/1712345678901.png")).status).toBe(200);
		expect((await call(`/api/images/avatar/${OTHER_UUID}.png`)).status).toBe(404);
	});
});

// ─── Downloads ───────────────────────────────────────────────────────────────
describe("GET /api/admin/wallet-pass", () => {
	it("401s without a session", async () => {
		expect((await call("/api/admin/wallet-pass")).status).toBe(401);
	});

	it("404s when the wallet pass is disabled", async () => {
		getSession.mockResolvedValue({ user: { id: "u1" } });
		expect((await call("/api/admin/wallet-pass")).status).toBe(404);
	});

	it("503s when enabled without signing material", async () => {
		getSession.mockResolvedValue({ user: { id: "u1" } });
		await setSetting("wallet_pass_enabled", "true");
		const res = await call("/api/admin/wallet-pass");
		expect(res.status).toBe(503);
		expect(res.headers.get("cache-control")).toBe("private, no-store");
	});
});

describe("GET /api/vcard", () => {
	it("404s unless vCard is enabled", async () => {
		await setSetting("vcard_data", JSON.stringify({ fullName: "Jane Doe" }));
		expect((await call("/api/vcard")).status).toBe(404);
	});

	it("serves the Branding vCard when there is no vCard block", async () => {
		await setSetting("vcard_enabled", "true");
		await setSetting("vcard_data", JSON.stringify({ fullName: "Jane Doe", email: "j@d.co" }));
		const res = await call("/api/vcard");
		expect(res.status).toBe(200);
		expect(res.headers.get("content-type")).toContain("text/vcard");
		expect(await res.text()).toContain("FN:Jane Doe");
	});

	it("?block= serves that block's card, and never falls back to another card", async () => {
		await setSetting("vcard_enabled", "true");
		await setSetting("vcard_data", JSON.stringify({ fullName: "Global Card" }));
		await db.insert(block).values([
			{
				id: "card-a",
				type: "vcard",
				position: 0,
				status: "published",
				config: JSON.stringify({ fullName: "Card A" }),
			},
			{
				id: "card-b",
				type: "vcard",
				position: 1,
				status: "published",
				config: JSON.stringify({ fullName: "Card B" }),
			},
			{
				id: "card-later",
				type: "vcard",
				position: 2,
				status: "published",
				config: JSON.stringify({ fullName: "Not Yet" }),
				scheduledStart: new Date(Date.now() + 86_400_000),
			},
		]);
		expect(await (await call("/api/vcard?block=card-b")).text()).toContain("FN:Card B");
		expect((await call("/api/vcard?block=card-later")).status).toBe(404);
		expect((await call("/api/vcard?block=missing")).status).toBe(404);
		// An oversized id is ignored: the footer behaviour (first live block).
		const long = await call(`/api/vcard?block=${"x".repeat(101)}`);
		expect(await long.text()).toContain("FN:Card A");
	});
});

describe("GET /api/health", () => {
	it("reports ok from the real route", async () => {
		const res = await call("/api/health");
		expect(res.status).toBe(200);
		expect(await res.json()).toMatchObject({ status: "ok", database: "ok", auth: "ok" });
	});
});

describe("misconfigured BETTER_AUTH_SECRET", () => {
	afterEach(() => {
		authState.problem = null;
	});

	it("503s every session route without touching Better Auth; health stays up and says why", async () => {
		authState.problem = "BETTER_AUTH_SECRET is not set.";
		vi.spyOn(console, "error").mockImplementation(() => {});
		for (const path of [
			"/api/auth/get-session",
			"/trpc/public.getPage",
			"/api/admin/wallet-pass",
		]) {
			expect((await call(path)).status, path).toBe(503);
		}
		expect(
			(await call("/api/upload", { method: "POST", headers: { origin: ORIGIN } })).status,
		).toBe(503);
		expect(authHandler).not.toHaveBeenCalled();
		expect(getSession).not.toHaveBeenCalled();

		const health = await call("/api/health");
		expect(health.status).toBe(503);
		expect(await health.json()).toMatchObject({ status: "degraded", auth: "misconfigured" });
	});
});

describe("scheduled()", () => {
	it("hands the maintenance run to waitUntil", async () => {
		await worker.scheduled(
			{ cron: "0 3 * * *" } as ScheduledController,
			envWith() as never,
			ctx as unknown as ExecutionContext,
		);
		expect(ctx.waitUntil).toHaveBeenCalledOnce();
		await expect(ctx.waitUntil.mock.calls[0]?.[0]).resolves.toBeUndefined();
	});
});

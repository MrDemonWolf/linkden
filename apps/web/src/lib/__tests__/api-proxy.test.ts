// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { isTrustedRequestOrigin } from "../../../../server/src/lib/origin";

const transport = vi.hoisted(() => ({ context: vi.fn(), api: vi.fn(), network: vi.fn() }));
vi.mock("@opennextjs/cloudflare", () => ({ getCloudflareContext: transport.context }));
vi.mock("@linkden/env/web", () => ({
	env: { NEXT_PUBLIC_SERVER_URL: "https://must-not-proxy.example.test" },
}));

import * as apiRoutes from "../../app/api/[[...path]]/route";
import * as trpcRoutes from "../../app/trpc/[[...path]]/route";
import { proxyApiRequest } from "../api-proxy";

function localRequest(path = "/api/auth/get-session", init: RequestInit = {}) {
	return new Request(`http://localhost:3001${path}`, {
		...init,
		headers: { host: "localhost:3001", ...Object.fromEntries(new Headers(init.headers)) },
	});
}

beforeEach(() => {
	vi.stubEnv("NODE_ENV", "production");
	vi.stubEnv("INTERNAL_SERVER_URL", "http://127.0.0.1:13000");
	transport.context
		.mockReset()
		.mockReturnValue({ env: { API: { fetch: transport.api } }, cf: { colo: "TEST" } });
	transport.api.mockReset().mockResolvedValue(new Response("upstream", { status: 202 }));
	transport.network.mockReset().mockResolvedValue(new Response("local"));
	vi.stubGlobal("fetch", transport.network);
});
afterEach(() => {
	vi.unstubAllGlobals();
	vi.unstubAllEnvs();
});

describe("same-origin API binding proxy", () => {
	it.each(["GET", "HEAD", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"] as const)(
		"proxies %s with its method, query and streamed body",
		async (method) => {
			let received: Request | undefined;
			let body = "";
			transport.api.mockImplementation(async (request: Request) => {
				received = request;
				body = await request.text();
				return new Response("response", { status: 202 });
			});
			const request = new Request(
				"https://admin.example.test/trpc/settings.updateBulk?batch=1&input=%7B%7D",
				{
					method,
					headers: {
						"content-type": "application/json",
						cookie: "session=dummy",
						authorization: "Bearer dummy",
						origin: "https://admin.example.test",
						referer: "https://admin.example.test/admin/settings",
						"sec-fetch-site": "same-origin",
					},
					body: ["GET", "HEAD"].includes(method) ? undefined : '{"test":true}',
				},
			);
			const response = await proxyApiRequest(request);
			expect(response.status).toBe(202);
			expect(received?.url).toBe(
				"https://api.internal/trpc/settings.updateBulk?batch=1&input=%7B%7D",
			);
			expect(received?.method).toBe(method);
			expect(received?.headers.get("host")).toBe("api.internal");
			for (const name of [
				"content-type",
				"cookie",
				"authorization",
				"origin",
				"referer",
				"sec-fetch-site",
			])
				expect(received?.headers.get(name)).toBe(request.headers.get(name));
			expect(body).toBe(["GET", "HEAD"].includes(method) ? "" : '{"test":true}');
			expect(await response.text()).toBe(method === "HEAD" ? "" : "response");
			expect(response.headers.get("cache-control")).toBe("private, no-store");
			expect(transport.network).not.toHaveBeenCalled();
		},
	);

	it("preserves separate cookies, status and redirect Location while stripping hop-by-hop headers", async () => {
		const headers = new Headers({
			location: "https://admin.example.test/admin",
			connection: "x-upstream-hop",
			"x-upstream-hop": "remove",
			"keep-alive": "timeout=5",
		});
		headers.append("set-cookie", "session=dummy; Path=/; HttpOnly; SameSite=Lax");
		headers.append(
			"set-cookie",
			"trust=dummy; Expires=Fri, 06 Nov 2026 12:00:00 GMT; Path=/; HttpOnly",
		);
		transport.api.mockResolvedValue(new Response(null, { status: 302, headers }));
		const response = await proxyApiRequest(
			new Request("https://admin.example.test/api/auth/callback"),
		);
		expect(response.status).toBe(302);
		expect(response.headers.get("location")).toBe("https://admin.example.test/admin");
		expect((response.headers as Headers & { getSetCookie(): string[] }).getSetCookie()).toEqual([
			"session=dummy; Path=/; HttpOnly; SameSite=Lax",
			"trust=dummy; Expires=Fri, 06 Nov 2026 12:00:00 GMT; Path=/; HttpOnly",
		]);
		expect(response.headers.has("connection")).toBe(false);
		expect(response.headers.has("x-upstream-hop")).toBe(false);
		expect(response.headers.has("keep-alive")).toBe(false);
		expect((transport.api.mock.calls[0]?.[0] as Request | undefined)?.redirect).toBe("manual");
	});

	it("keeps the API's immutable caching for successful image reads only", async () => {
		const immutable = "public, max-age=31536000, immutable";
		const image = (status = 200, extra: Record<string, string> = {}) =>
			new Response(status === 304 ? null : "png", {
				status,
				headers: { "cache-control": immutable, etag: '"abc"', ...extra },
			});
		const path = "/api/images/avatar/0f8b3c2e-1d4a-4b6c-9e7f-123456789abc.png";
		for (const [method, status] of [
			["GET", 200],
			["HEAD", 200],
			["GET", 304],
		] as const) {
			transport.api.mockResolvedValueOnce(image(status));
			const response = await proxyApiRequest(
				new Request(`https://linkden.example.workers.dev${path}`, { method }),
			);
			expect(response.status).toBe(status);
			expect(response.headers.get("cache-control")).toBe(immutable);
			expect(response.headers.get("etag")).toBe('"abc"');
		}
		// Errors, cookie-bearing responses and every non-image path stay private.
		const privateCases: [string, string, Response][] = [
			["GET", path, image(404)],
			["GET", path, image(200, { "set-cookie": "s=1; Path=/" })],
			["POST", path, image()],
			["GET", "/api/imagesx/avatar/a.png", image()],
			["GET", "/api/auth/get-session", image()],
			["GET", "/trpc/public.getPage", image()],
		];
		for (const [method, privatePath, upstream] of privateCases) {
			transport.api.mockResolvedValueOnce(upstream);
			const response = await proxyApiRequest(
				new Request(`https://linkden.example.workers.dev${privatePath}`, { method }),
			);
			expect(response.headers.get("cache-control")).toBe("private, no-store");
		}
	});

	it("strips forwarding metadata and nominated headers but retains only trusted edge IP", async () => {
		await proxyApiRequest(
			new Request("https://admin.example.test/api/health", {
				headers: {
					connection: "keep-alive, x-private-hop",
					"x-private-hop": "remove",
					"x-forwarded-for": "forged",
					"x-forwarded-host": "evil.example",
					"x-forwarded-proto": "http",
					"x-real-ip": "forged",
					forwarded: "for=forged",
					via: "forged",
					"cf-ray": "forged",
					"cf-visitor": "forged",
					"cf-connecting-ip": "203.0.113.10",
					"x-original-url": "/admin",
					"x-rewrite-url": "/admin",
				},
			}),
		);
		const request = transport.api.mock.calls[0]?.[0] as Request;
		expect(request.headers.get("cf-connecting-ip")).toBe("203.0.113.10");
		for (const name of [
			"connection",
			"x-private-hop",
			"x-forwarded-for",
			"x-forwarded-host",
			"x-forwarded-proto",
			"x-real-ip",
			"forwarded",
			"via",
			"cf-ray",
			"cf-visitor",
			"x-original-url",
			"x-rewrite-url",
		])
			expect(request.headers.has(name)).toBe(false);
		transport.context.mockReturnValue({ env: { API: { fetch: transport.api } } });
		await proxyApiRequest(
			new Request("https://admin.example.test/api/health", {
				headers: { "cf-connecting-ip": "203.0.113.10" },
			}),
		);
		expect(
			(transport.api.mock.calls[1]?.[0] as Request | undefined)?.headers.has("cf-connecting-ip"),
		).toBe(false);
	});

	it("keeps a legacy workers.dev sign-in single-origin through the binding", async () => {
		// workers.dev is on the Public Suffix List: the session cookie cannot reach
		// the API worker's own hostname, so the web origin must carry auth calls.
		let received: Request | undefined;
		let body = "";
		transport.api.mockImplementation(async (request: Request) => {
			received = request;
			body = await request.text();
			return new Response("{}", { status: 200 });
		});
		const response = await proxyApiRequest(
			new Request("https://linkden.example.workers.dev/api/auth/sign-in/email", {
				method: "POST",
				headers: {
					cookie: "s=1",
					"cf-connecting-ip": "203.0.113.7",
					origin: "https://linkden.example.workers.dev",
					"content-type": "application/json",
				},
				body: "{}",
			}),
		);
		expect(response.status).toBe(200);
		expect(received?.url).toBe("https://api.internal/api/auth/sign-in/email");
		expect(received?.headers.get("cookie")).toBe("s=1");
		expect(received?.headers.get("cf-connecting-ip")).toBe("203.0.113.7");
		expect(received?.headers.get("origin")).toBe("https://linkden.example.workers.dev");
		expect(body).toBe("{}");
		expect(transport.network).not.toHaveBeenCalled();
	});

	it("preserves cross-site Origin evidence for the API's real CSRF check", async () => {
		transport.api.mockImplementation(async (request: Request) => {
			const trusted = isTrustedRequestOrigin({
				origin: request.headers.get("origin") ?? undefined,
				secFetchSite: request.headers.get("sec-fetch-site") ?? undefined,
				allowed: "https://admin.example.test",
				self: new URL(request.url).origin,
			});
			return new Response(trusted ? "allowed" : "blocked", { status: trusted ? 200 : 403 });
		});
		for (const origin of ["https://evil.example.test", "null"]) {
			const response = await proxyApiRequest(
				new Request("https://admin.example.test/trpc/write", {
					method: "POST",
					headers: { origin, cookie: "session=dummy", "sec-fetch-site": "cross-site" },
				}),
			);
			expect(response.status).toBe(403);
		}
		const valid = await proxyApiRequest(
			new Request("https://admin.example.test/trpc/write", {
				method: "POST",
				headers: { origin: "https://admin.example.test", "sec-fetch-site": "same-origin" },
			}),
		);
		expect(valid.status).toBe(200);
	});

	it("passes all streamed bytes and length evidence through to the API's body limiter", async () => {
		const body = new Uint8Array(64 * 1024 + 1).fill(241);
		transport.api.mockImplementation(async (request: Request) => {
			expect(request.headers.get("content-length")).toBe("8");
			expect(new Uint8Array(await request.arrayBuffer())).toEqual(body);
			return new Response("received");
		});
		const response = await proxyApiRequest(
			new Request("https://admin.example.test/api/auth/test", {
				method: "POST",
				headers: { "content-length": "8", "content-type": "application/octet-stream" },
				body,
			}),
		);
		expect(response.status).toBe(200);
	});

	it.each([
		"/",
		"/admin",
		"/apix/test",
		"/apiary",
		"/trpcx/test",
		"/og",
		"/api/../admin",
		"/api/%2f%2fevil.example/test",
		"/api/%5cadmin",
	])("never proxies a public or ambiguous path %s", async (path) => {
		expect(
			(await proxyApiRequest(new Request(`https://admin.example.test${path}`))).status,
		).toBeGreaterThanOrEqual(400);
		expect(transport.api).not.toHaveBeenCalled();
		expect(transport.network).not.toHaveBeenCalled();
	});

	it("rejects a loop marker or CSRF-header Connection nomination before dispatch", async () => {
		expect(
			(
				await proxyApiRequest(
					new Request("https://admin.example.test/api/health", {
						headers: { "x-linkden-api-proxy": "1" },
					}),
				)
			).status,
		).toBe(508);
		expect(
			(
				await proxyApiRequest(
					new Request("https://admin.example.test/api/health", {
						headers: { connection: "Origin", origin: "https://evil.example.test" },
					}),
				)
			).status,
		).toBe(400);
		expect(transport.api).not.toHaveBeenCalled();
	});

	it("exposes exactly the supported methods on both Next route modules", () => {
		for (const routes of [apiRoutes, trpcRoutes]) {
			for (const method of ["GET", "HEAD", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"] as const)
				expect(routes[method]).toBe(proxyApiRequest);
			expect(routes.dynamic).toBe("force-dynamic");
		}
	});
});

describe("explicit local preview fallback", () => {
	beforeEach(() => {
		transport.context.mockImplementation(() => {
			throw new Error("no Workers context");
		});
	});
	it.each(
		["localhost", "127.0.0.1", "[::1]"].flatMap((urlHost) =>
			["localhost", "127.0.0.1", "[::1]"].map((headerHost) => [urlHost, headerHost] as const),
		),
	)(
		"supports strict local Next aliases URL=%s Host=%s at the same port",
		async (urlHost, headerHost) => {
			vi.stubEnv("INTERNAL_SERVER_URL", `http://${headerHost}:13000`);
			const response = await proxyApiRequest(
				new Request(`http://${urlHost}:3001/api/health`, {
					headers: {
						host: `${headerHost}:3001`,
						"x-forwarded-host": `${headerHost}:3001`,
						"x-forwarded-proto": "http",
					},
				}),
			);
			expect(response.status).toBe(200);
			expect((transport.network.mock.calls[0]?.[0] as Request | undefined)?.url).toBe(
				`http://${headerHost}:13000/api/health`,
			);
		},
	);
	it.each([
		"remote.example.test:3001",
		"localhost.:3001",
		"2130706433:3001",
		"%6cocalhost:3001",
		"127.0.0.1:3002",
		"[::ffff:127.0.0.1]:3001",
		"localhost:3001/path",
		"localhost:3001?query=1",
		"localhost:3001#fragment",
	])("still refuses a foreign, ambiguous or different-port Host %s", async (host) => {
		const response = await proxyApiRequest(
			new Request("http://localhost:3001/api/health", { headers: { host } }),
		);
		expect(response.status).toBe(503);
		expect(transport.network).not.toHaveBeenCalled();
	});
	it.each(["development", "production"])(
		"supports a loopback %s preview with an explicit private target",
		async (mode) => {
			vi.stubEnv("NODE_ENV", mode);
			const response = await proxyApiRequest(localRequest("/api/health?probe=1"));
			expect(response.status).toBe(200);
			const request = transport.network.mock.calls[0]?.[0] as Request;
			expect(request.url).toBe("http://127.0.0.1:13000/api/health?probe=1");
			expect(request.headers.get("host")).toBe("127.0.0.1:13000");
			expect(request.headers.get("accept-encoding")).toBe("identity");
		},
	);
	it.each([
		"",
		"https://remote.example.test",
		"http://remote.example.test",
		"http://localhost:3001",
		"http://127.0.0.1:3001",
		"http://localhost:13000/path",
		"http://localhost:13000/path/..",
		"http://user@localhost:13000",
		"http://localhost:13000?upstream=evil",
		"http://2130706433:13000",
		"http://%6cocalhost:13000",
		"http://127.1:13000",
		"http://localhost:13000#fragment",
	])(
		"fails closed for missing, nonlocal, self-recursing or ambiguous target %j",
		async (target) => {
			vi.stubEnv("INTERNAL_SERVER_URL", target);
			expect((await proxyApiRequest(localRequest())).status).toBe(503);
			expect(transport.network).not.toHaveBeenCalled();
		},
	);
	it("will not turn a public/tunnel request into a loopback auth request", async () => {
		expect(
			(await proxyApiRequest(new Request("https://public.example.test/api/auth/dev-login"))).status,
		).toBe(503);
		const metadata: Record<string, string>[] = [
			{ "cf-ray": "edge" },
			{ forwarded: "for=127.0.0.1" },
			{ "x-forwarded-for": "203.0.113.10" },
			{ "x-forwarded-host": "public.example.test" },
			{ "x-forwarded-host": "localhost:3001/path" },
			{ "x-forwarded-host": "localhost:3001?public.example.test" },
		];
		for (const headers of metadata) {
			expect((await proxyApiRequest(localRequest("/api/auth/dev-login", { headers }))).status).toBe(
				503,
			);
		}
		expect(transport.network).not.toHaveBeenCalled();
	});
	it("returns a bounded upstream error instead of redirecting to the public API", async () => {
		transport.network.mockRejectedValue(new Error("private upstream failed"));
		const response = await proxyApiRequest(localRequest());
		expect(response.status).toBe(502);
		expect(await response.text()).not.toContain("private upstream failed");
		expect(response.headers.has("location")).toBe(false);
	});
});

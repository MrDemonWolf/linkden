// @vitest-environment node
import { NextRequest } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { config, proxy } from "../../proxy";

const ORIGIN = "https://links.example.com";

function run(path: string, cookie?: string) {
	return proxy(new NextRequest(`${ORIGIN}${path}`, cookie ? { headers: { cookie } } : undefined));
}

/** NextResponse.next() marks the response instead of redirecting. */
const passedThrough = (res: Response) => res.headers.get("x-middleware-next") === "1";

describe("proxy (edge gate for /admin/*)", () => {
	afterEach(() => vi.unstubAllEnvs());

	it("preserves the public root in legacy mode", () => {
		vi.stubEnv("LINKDEN_SERVING_MODE", "legacy");
		expect(passedThrough(run("/?utm_source=test"))).toBe(true);
	});

	it("redirects the split admin root before profile rendering, then applies the usual auth gate", () => {
		vi.stubEnv("LINKDEN_SERVING_MODE", "split");
		const root = run("/?utm_source=test");
		expect(root.status).toBe(307);
		expect(root.headers.get("location")).toBe(`${ORIGIN}/admin/links`);
		expect(root.headers.get("x-middleware-next")).toBeNull();
		expect(run("/admin/links").headers.get("location")).toContain("/admin/login?from=");
	});

	it.each(["/api/health", "/trpc/publication.status", "/_next/static/main.js", "/og", "/logo.svg"])(
		"does not intercept %s in split mode",
		(path) => {
			vi.stubEnv("LINKDEN_SERVING_MODE", "split");
			expect(passedThrough(run(path))).toBe(true);
			expect(config.matcher).toEqual(["/", "/admin/:path*"]);
		},
	);
	it("sends a signed-out visitor to login with ?from= the path", () => {
		const res = run("/admin/links");
		expect(res.status).toBe(307);
		expect(res.headers.get("location")).toBe(`${ORIGIN}/admin/login?from=%2Fadmin%2Flinks`);
	});

	it.each(["__Secure-better-auth.session_token=abc", "better-auth.session_token=abc"])(
		"lets a request carrying %s through",
		(cookie) => {
			const res = run("/admin/links", cookie);
			expect(passedThrough(res)).toBe(true);
			expect(res.headers.get("location")).toBeNull();
		},
	);

	it("redirects a legacy ?tab= URL before the auth check", () => {
		const res = run("/admin/settings?tab=seo");
		expect(res.status).toBe(307);
		expect(res.headers.get("location")).toBe(`${ORIGIN}/admin/design/seo`);
	});

	it.each(["/admin/login", "/admin/manifest.webmanifest", "/admin/reset-password"])(
		"lets the public page %s through without a cookie",
		(path) => {
			expect(passedThrough(run(path))).toBe(true);
		},
	);

	it("gates a lookalike of a public route", () => {
		const res = run("/admin/loginx");
		expect(res.status).toBe(307);
		expect(res.headers.get("location")).toBe(`${ORIGIN}/admin/login?from=%2Fadmin%2Floginx`);
	});
});

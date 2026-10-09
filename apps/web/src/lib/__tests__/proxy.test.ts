// @vitest-environment node
import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";
import { proxy } from "../../proxy";

const ORIGIN = "https://links.example.com";

function run(path: string, cookie?: string) {
	return proxy(new NextRequest(`${ORIGIN}${path}`, cookie ? { headers: { cookie } } : undefined));
}

/** NextResponse.next() marks the response instead of redirecting. */
const passedThrough = (res: Response) => res.headers.get("x-middleware-next") === "1";

describe("proxy (edge gate for /admin/*)", () => {
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

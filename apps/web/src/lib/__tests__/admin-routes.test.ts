// @vitest-environment node
import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";
import { proxy } from "../../proxy";
import { hasSessionCookie, isPublicAdminRoute, PUBLIC_ADMIN_ROUTES } from "../admin-routes";

describe("isPublicAdminRoute", () => {
	it.each([
		"/admin/login",
		"/admin/setup",
		"/admin/setup/step",
		"/admin/reset-password",
		"/admin/manifest.webmanifest",
	])("lets %s through without a session", (path) => {
		expect(isPublicAdminRoute(path)).toBe(true);
	});

	it.each(["/admin", "/admin/links", "/admin/loginx", "/admin/reset-passwordX", "/admin/settings"])(
		"gates %s",
		(path) => {
			expect(isPublicAdminRoute(path)).toBe(false);
		},
	);

	it("includes the emailed reset-password page", () => {
		expect(PUBLIC_ADMIN_ROUTES).toContain("/admin/reset-password");
	});
});

describe("hasSessionCookie", () => {
	const jar = (...names: string[]) => ({ has: (n: string) => names.includes(n) });

	it("recognises the plain and __Secure- Better Auth cookies", () => {
		expect(hasSessionCookie(jar("better-auth.session_token"))).toBe(true);
		expect(hasSessionCookie(jar("__Secure-better-auth.session_token"))).toBe(true);
	});

	it("is false for unrelated cookies", () => {
		expect(hasSessionCookie(jar("linkden-color-mode", "session_token"))).toBe(false);
	});
});

describe("proxy (edge gate)", () => {
	it("keeps the emailed reset link and its token intact for a signed-out visitor", () => {
		const res = proxy(new NextRequest("https://linkden.test/admin/reset-password?token=abc"));
		expect(res.headers.get("location")).toBeNull();
		expect(res.headers.get("x-middleware-next")).toBe("1");
	});

	it("sends a signed-out visitor to login with the requested path in ?from=", () => {
		const res = proxy(new NextRequest("https://linkden.test/admin/settings/wallet"));
		const location = new URL(res.headers.get("location") ?? "");
		expect(location.pathname).toBe("/admin/login");
		expect(location.searchParams.get("from")).toBe("/admin/settings/wallet");
	});

	it("lets a request carrying a session cookie through", () => {
		const req = new NextRequest("https://linkden.test/admin/inbox", {
			headers: { cookie: "better-auth.session_token=x" },
		});
		expect(proxy(req).headers.get("location")).toBeNull();
	});
});

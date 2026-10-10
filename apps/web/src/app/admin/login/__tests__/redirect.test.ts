import { describe, expect, it } from "vitest";
import { safeAdminRedirect } from "../redirect";

describe("safeAdminRedirect", () => {
	it.each([
		["/admin/inbox", "/admin/inbox"],
		["/admin/settings/email", "/admin/settings/email"],
		["/admin/design/", "/admin/design"],
		["/admin", "/admin"],
	])("returns the requested admin path %s", (from, expected) => {
		expect(safeAdminRedirect(from)).toBe(expected);
	});

	it.each([
		null,
		undefined,
		"",
		"https://evil.example/admin",
		"//evil.example/admin",
		"/\\evil.example",
		"/admin/../../evil",
		"/administrator",
		"/admin//evil.example",
		"/admin/inbox?x=https://evil.example",
		"/admin/inbox#frag",
		"javascript:alert(1)",
		"/admin/login",
		"/admin/setup",
		"/admin/reset-password",
		"/admin/login/extra",
		"/",
	])("falls back to /admin for %s", (from) => {
		expect(safeAdminRedirect(from)).toBe("/admin");
	});
});

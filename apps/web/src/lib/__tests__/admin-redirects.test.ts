import { describe, expect, it } from "vitest";
import { legacyAdminPath, legacyAdminRedirect } from "../admin-redirects";

describe("legacyAdminPath", () => {
	it.each([
		["/admin", "/admin/links"],
		["/admin/builder", "/admin/links"],
		["/admin/social", "/admin/links/social"],
		["/admin/appearance", "/admin/design"],
		["/admin/analytics", "/admin/insights"],
		["/admin/connections", "/admin/inbox"],
		["/admin/forms", "/admin/inbox"],
		["/admin/account", "/admin/settings"],
		["/admin/wallet", "/admin/settings/wallet"],
		["/admin/settings", "/admin/settings"],
	])("maps %s → %s without a tab", (from, to) => {
		expect(legacyAdminPath(from)).toBe(to);
		expect(legacyAdminPath(from, undefined)).toBe(to);
		expect(legacyAdminPath(from, null)).toBe(to);
	});

	it.each([
		["/admin/builder", "profile", "/admin/links/profile"],
		["/admin/builder", "social", "/admin/links/social"],
		["/admin/settings", "seo", "/admin/design/seo"],
		["/admin/settings", "branding", "/admin/design/branding"],
		["/admin/settings", "privacy", "/admin/design/branding"],
		["/admin/settings", "email", "/admin/settings/email"],
		["/admin/settings", "features", "/admin/settings/integrations"],
		["/admin/settings", "data", "/admin/settings/data"],
	])("maps %s?tab=%s → %s", (from, tab, to) => {
		expect(legacyAdminPath(from, tab)).toBe(to);
	});

	it("sends unknown tabs to the destination root", () => {
		expect(legacyAdminPath("/admin/builder", "nope")).toBe("/admin/links");
		expect(legacyAdminPath("/admin/settings", "nope")).toBe("/admin/settings");
		expect(legacyAdminPath("/admin/settings", "")).toBe("/admin/settings");
	});

	it("ignores tabs on routes that never had them", () => {
		expect(legacyAdminPath("/admin/appearance", "seo")).toBe("/admin/design");
		expect(legacyAdminPath("/admin/wallet", "data")).toBe("/admin/settings/wallet");
	});

	it("tolerates a trailing slash and falls back to the home destination", () => {
		expect(legacyAdminPath("/admin/")).toBe("/admin/links");
		expect(legacyAdminPath("/admin/unknown")).toBe("/admin/links");
	});
});

describe("legacyAdminRedirect (edge proxy)", () => {
	it.each([
		["/admin", null, "/admin/links"],
		["/admin/", null, "/admin/links"],
		["/admin/builder", null, "/admin/links"],
		["/admin/builder", "profile", "/admin/links/profile"],
		["/admin/builder", "social", "/admin/links/social"],
		["/admin/builder", "nope", "/admin/links"],
		["/admin/social", null, "/admin/links/social"],
		["/admin/appearance", null, "/admin/design"],
		["/admin/analytics", null, "/admin/insights"],
		["/admin/connections", null, "/admin/inbox"],
		["/admin/forms", null, "/admin/inbox"],
		["/admin/account", null, "/admin/settings"],
		["/admin/wallet", null, "/admin/settings/wallet"],
		["/admin/settings", "email", "/admin/settings/email"],
		["/admin/settings", "features", "/admin/settings/integrations"],
		["/admin/settings", "data", "/admin/settings/data"],
		["/admin/settings", "seo", "/admin/design/seo"],
		["/admin/settings", "branding", "/admin/design/branding"],
		["/admin/settings", "privacy", "/admin/design/branding"],
	])("redirects %s?tab=%s → %s", (from, tab, to) => {
		expect(legacyAdminRedirect(from, tab)).toBe(to);
	});

	it.each([
		["/admin/settings", null],
		["/admin/settings", ""],
		["/admin/settings", "nope"],
		["/admin/links", null],
		["/admin/links/social", null],
		["/admin/design/seo", null],
		["/admin/insights", null],
		["/admin/inbox", null],
		["/admin/settings/email", null],
		["/admin/login", null],
		["/admin/setup", null],
		["/admin/reset-password", null],
		["/admin/manifest.webmanifest", null],
		["/admin/unknown", null],
	])("leaves %s?tab=%s alone", (from, tab) => {
		expect(legacyAdminRedirect(from, tab)).toBeNull();
	});
});

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { BottomTabBar } from "../admin-shell";
import { activeNavItem, isNavActive, NAV_ITEMS, subTabLabel } from "../nav-list";

vi.mock("next/navigation", () => ({ usePathname: () => "/admin/links" }));
vi.mock("@linkden/env/web", () => ({
	env: {
		NEXT_PUBLIC_SERVER_URL: "http://localhost:3000",
		NEXT_PUBLIC_SITE_URL: "http://localhost:3001",
	},
}));
afterEach(cleanup);

describe("shared admin navigation", () => {
	it("keeps profile authoring and settings without retired feature routes", () => {
		expect(NAV_ITEMS.map((item) => item.href)).toEqual([
			"/admin/links",
			"/admin/design",
			"/admin/inbox",
			"/admin/settings",
		]);
		expect(activeNavItem("/admin/links/social")?.label).toBe("Profile page");
		expect(activeNavItem("/admin/insights")).toBeUndefined();
		expect(isNavActive("/admin/links", "/admin/links-extra")).toBe(false);
		expect(new Set(NAV_ITEMS.map((item) => item.href)).size).toBe(NAV_ITEMS.length);
	});

	it("labels derived sub-tab crumbs like the SubTabs strips, acronyms included", () => {
		// Design/Links layouts report no kicker, so the top bar reads the path segment.
		expect(subTabLabel("seo")).toBe("SEO");
		for (const [segment, label] of [
			["banner", "Banner"],
			["branding", "Branding"],
			["profile", "Profile"],
			["social", "Social"],
			["two-words", "Two Words"],
		]) {
			expect(subTabLabel(segment)).toBe(label);
		}
	});

	it("keeps compact mobile tabs and reaches Design and Settings through a keyboard menu", async () => {
		render(<BottomTabBar pathname="/admin/design" unreadCount={2} />);
		expect(screen.getByRole("link", { name: "Profile page" }).textContent).toContain("Profile");
		expect(screen.getByRole("link", { name: "Inbox, 2 unread" }).getAttribute("href")).toBe(
			"/admin/inbox",
		);
		expect(screen.getAllByRole("link")).toHaveLength(2);
		const more = screen.getByRole("button", { name: "More navigation" });
		expect(more.getAttribute("aria-current")).toBe("page");
		more.focus();
		fireEvent.keyDown(more, { key: "ArrowDown" });
		const design = await screen.findByRole("menuitem", { name: "Design" });
		expect(design.getAttribute("href")).toBe("/admin/design");
		expect(design.getAttribute("aria-current")).toBe("page");
		expect(screen.getByRole("menuitem", { name: "Settings" }).getAttribute("href")).toBe(
			"/admin/settings",
		);
	});
});

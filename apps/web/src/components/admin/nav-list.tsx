"use client";

import { Inbox, Link2, type LucideIcon, Palette, Settings } from "lucide-react";
import type { Route } from "next";

export interface NavItem {
	href: Route;
	label: string;
	icon: LucideIcon;
	group: "Create" | "Manage";
	/** A compact primary tab; other destinations live in the mobile More menu. */
	mobileLabel?: string;
}

/** Shared destinations for the sidebar, mobile tabs and breadcrumb. */
export const NAV_ITEMS: readonly NavItem[] = [
	{
		href: "/admin/links",
		label: "Profile page",
		mobileLabel: "Profile",
		icon: Link2,
		group: "Create",
	},
	{ href: "/admin/design", label: "Design", icon: Palette, group: "Create" },
	{ href: "/admin/inbox", label: "Inbox", mobileLabel: "Inbox", icon: Inbox, group: "Manage" },
	{ href: "/admin/settings", label: "Settings", icon: Settings, group: "Manage" },
];

export function isNavActive(href: string, pathname: string) {
	return pathname === href || pathname.startsWith(`${href}/`);
}

/** The destination that owns `pathname` (sub-tab routes included), if any. */
export function activeNavItem(pathname: string) {
	return NAV_ITEMS.find((item) => isNavActive(item.href, pathname));
}

/** Path segments whose sub-tab label is not just the capitalized word. */
const SEGMENT_LABELS: Readonly<Record<string, string>> = { seo: "SEO" };

/**
 * Breadcrumb label for a sub-tab path segment when the page reports no kicker:
 * `seo` → "SEO", `profile` → "Profile", `two-words` → "Two Words". Matches the
 * destination layouts' SubTabs labels.
 */
export function subTabLabel(segment: string) {
	return (
		SEGMENT_LABELS[segment] ??
		segment
			.split("-")
			.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
			.join(" ")
	);
}

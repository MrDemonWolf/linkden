"use client";

import { BarChart3, Inbox, Link2, type LucideIcon, Palette, Settings } from "lucide-react";
import type { Route } from "next";

export interface NavItem {
	href: Route;
	label: string;
	icon: LucideIcon;
}

/** The five destinations. One data source for the sidebar, the bottom tab bar and the breadcrumb. */
export const NAV_ITEMS: readonly NavItem[] = [
	{ href: "/admin/links", label: "Links", icon: Link2 },
	{ href: "/admin/design", label: "Design", icon: Palette },
	{ href: "/admin/insights", label: "Insights", icon: BarChart3 },
	{ href: "/admin/inbox", label: "Inbox", icon: Inbox },
	{ href: "/admin/settings", label: "Settings", icon: Settings },
];

export function isNavActive(href: string, pathname: string) {
	return pathname === href || pathname.startsWith(`${href}/`);
}

/** The destination that owns `pathname` (sub-tab routes included), if any. */
export function activeNavItem(pathname: string) {
	return NAV_ITEMS.find((item) => isNavActive(item.href, pathname));
}

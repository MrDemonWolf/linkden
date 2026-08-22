"use client";

import {
	BarChart3,
	Blocks,
	Handshake,
	LayoutDashboard,
	type LucideIcon,
	Palette,
	Settings,
	UserCog,
	Wallet,
} from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { cn } from "@/lib/utils";

export interface NavItem {
	href: Route;
	label: string;
	icon: LucideIcon;
	/** Also shown in the mobile bottom tab bar. */
	bottom?: boolean;
}

export const NAV_GROUPS: readonly { label: string; items: readonly NavItem[] }[] = [
	{
		label: "Main",
		items: [
			{ href: "/admin", label: "Dashboard", icon: LayoutDashboard, bottom: true },
			{ href: "/admin/builder", label: "Builder", icon: Blocks, bottom: true },
			{ href: "/admin/appearance", label: "Appearance", icon: Palette },
		],
	},
	{
		label: "Engage",
		items: [
			{ href: "/admin/analytics", label: "Analytics", icon: BarChart3, bottom: true },
			{ href: "/admin/connections", label: "Connections", icon: Handshake, bottom: true },
		],
	},
	{
		label: "System",
		items: [
			{ href: "/admin/wallet", label: "Wallet", icon: Wallet },
			{ href: "/admin/account", label: "Account", icon: UserCog },
			{ href: "/admin/settings", label: "Settings", icon: Settings, bottom: true },
		],
	},
];

export function isNavActive(href: string, pathname: string) {
	return href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);
}

/**
 * Grouped admin navigation: kicker label per group, 44px rows, aria-current on
 * the active route with the Signal bar as its left-edge indicator. Shared by
 * the desktop sidebar and the mobile Sheet.
 */
export function NavList({
	pathname,
	unreadCount,
	onNavClick,
}: {
	pathname: string;
	unreadCount: number;
	onNavClick?: () => void;
}) {
	return (
		<nav aria-label="Main navigation" className="space-y-3 px-2 py-2">
			{NAV_GROUPS.map((group) => (
				<div key={group.label} className="space-y-0.5">
					<p className="px-3 pt-1 pb-1 text-micro font-bold uppercase tracking-widest text-muted-foreground">
						{group.label}
					</p>
					{group.items.map((item) => {
						const isActive = isNavActive(item.href, pathname);
						const showBadge = item.label === "Connections" && unreadCount > 0;
						const Icon = item.icon;

						return (
							<Link
								key={item.href}
								href={item.href}
								onClick={onNavClick}
								aria-current={isActive ? "page" : undefined}
								aria-label={showBadge ? `${item.label}, ${unreadCount} unread` : undefined}
								className={cn(
									"relative flex min-h-[44px] items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-all",
									isActive
										? "bg-primary/10 text-foreground"
										: "text-muted-foreground hover:bg-muted hover:text-foreground",
								)}
							>
								{isActive && (
									<span
										aria-hidden
										className="absolute inset-y-2 left-0 w-0.5 rounded-full bg-[image:var(--signal)]"
									/>
								)}
								<Icon className={cn("h-4 w-4 shrink-0", isActive && "text-primary")} />
								<span>{item.label}</span>
								{showBadge && (
									<span className="ml-auto flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-micro font-semibold text-primary-foreground">
										{unreadCount > 99 ? "99+" : unreadCount}
									</span>
								)}
							</Link>
						);
					})}
				</div>
			))}
		</nav>
	);
}

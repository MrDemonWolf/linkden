"use client";

import { BarChart3, Inbox, Link2, type LucideIcon, Palette, Settings } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { TooltipHint } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export interface NavItem {
	href: Route;
	label: string;
	icon: LucideIcon;
}

/** The five destinations. One data source for the sidebar, the bottom tab bar and the kicker. */
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

/**
 * Shared row recipe: 40px, static states only — the active row is a primary
 * tint, the idle row lifts to --surface-2 on hover. No indicator bar.
 * Reused by the settings vertical nav so both lists read as one idiom.
 */
export const NAV_ROW_CLASS =
	"relative flex h-10 items-center rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";
export const NAV_ROW_ACTIVE_CLASS = "bg-primary/10 font-medium text-foreground";
export const NAV_ROW_IDLE_CLASS = "text-muted-foreground hover:bg-surface-2 hover:text-foreground";

function Badge({ count, className }: { count: number; className?: string }) {
	return (
		<span
			className={cn(
				"flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-micro font-semibold text-primary-foreground",
				className,
			)}
		>
			{count > 99 ? "99+" : count}
		</span>
	);
}

/**
 * Sidebar navigation. `sidebar` (xl, 208px): icon beside a text-sm label per
 * 40px row. `rail` (lg–xl, 64px): icon-only 40px squares with Tooltip labels.
 * aria-current marks the active route; its state is the static row tint.
 */
export function NavList({
	pathname,
	unreadCount,
	variant = "sidebar",
}: {
	pathname: string;
	unreadCount: number;
	variant?: "sidebar" | "rail";
}) {
	const rail = variant === "rail";

	return (
		<nav
			aria-label="Main navigation"
			className={cn("flex flex-col gap-1 py-3", rail ? "items-center px-3" : "px-3")}
		>
			{NAV_ITEMS.map((item) => {
				const isActive = isNavActive(item.href, pathname);
				const showBadge = item.label === "Inbox" && unreadCount > 0;
				const Icon = item.icon;
				const accessibleName = showBadge ? `${item.label}, ${unreadCount} unread` : item.label;

				if (rail) {
					return (
						<TooltipHint key={item.href} content={item.label} side="right">
							<Link
								href={item.href}
								aria-current={isActive ? "page" : undefined}
								aria-label={accessibleName}
								className={cn(
									NAV_ROW_CLASS,
									"w-10 justify-center",
									isActive ? NAV_ROW_ACTIVE_CLASS : NAV_ROW_IDLE_CLASS,
								)}
							>
								<Icon className={cn("h-4 w-4 shrink-0", isActive && "text-primary")} />
								{showBadge && <Badge count={unreadCount} className="absolute -right-1 -top-1" />}
							</Link>
						</TooltipHint>
					);
				}

				return (
					<Link
						key={item.href}
						href={item.href}
						aria-current={isActive ? "page" : undefined}
						aria-label={showBadge ? accessibleName : undefined}
						className={cn(
							NAV_ROW_CLASS,
							"gap-3 px-3 text-sm",
							isActive ? NAV_ROW_ACTIVE_CLASS : NAV_ROW_IDLE_CLASS,
						)}
					>
						<Icon className={cn("h-4 w-4 shrink-0", isActive && "text-primary")} />
						<span className="truncate">{item.label}</span>
						{showBadge && <Badge count={unreadCount} className="ml-auto" />}
					</Link>
				);
			})}
		</nav>
	);
}

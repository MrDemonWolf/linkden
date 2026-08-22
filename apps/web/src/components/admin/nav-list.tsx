"use client";

import { BarChart3, Inbox, Link2, type LucideIcon, Palette, Settings } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { useLayoutEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

export interface NavItem {
	href: Route;
	label: string;
	icon: LucideIcon;
}

/** The five destinations. One data source for the rail, the bottom tab bar and the kicker. */
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
 * Rail navigation: icon over a text-micro label when collapsed (64px), icon
 * beside a text-sm label when `expanded` (hover/pin at xl). aria-current on
 * the active route; one Signal bar slides (180ms) to the active item's
 * left edge — measured from the DOM so it survives the collapsed/expanded
 * height change.
 */
export function NavList({
	pathname,
	unreadCount,
	expanded = false,
}: {
	pathname: string;
	unreadCount: number;
	expanded?: boolean;
}) {
	const navRef = useRef<HTMLElement>(null);
	const [bar, setBar] = useState<{ top: number; height: number } | null>(null);
	// Re-measured after every render (route or expanded change), cheap; the
	// equality guard keeps it from re-rendering when nothing moved.
	useLayoutEffect(() => {
		const active = navRef.current?.querySelector<HTMLElement>('[aria-current="page"]');
		// inset-y-2 of the old per-item bar: 8px in from the link's top and bottom.
		const next = active ? { top: active.offsetTop + 8, height: active.offsetHeight - 16 } : null;
		setBar((prev) =>
			prev?.top === next?.top && prev?.height === next?.height && !!prev === !!next ? prev : next,
		);
	});

	return (
		<nav
			ref={navRef}
			aria-label="Main navigation"
			className="relative flex flex-col gap-1 px-2 py-2"
		>
			{bar && (
				<span
					aria-hidden
					style={{ top: bar.top, height: bar.height }}
					className="absolute left-2 w-0.5 rounded-full bg-[image:var(--signal)] transition-[top,height] duration-180 ease-out"
				/>
			)}
			{NAV_ITEMS.map((item) => {
				const isActive = isNavActive(item.href, pathname);
				const showBadge = item.label === "Inbox" && unreadCount > 0;
				const Icon = item.icon;

				return (
					<Link
						key={item.href}
						href={item.href}
						aria-current={isActive ? "page" : undefined}
						aria-label={showBadge ? `${item.label}, ${unreadCount} unread` : undefined}
						className={cn(
							"relative flex min-h-[44px] items-center rounded-lg font-medium transition-colors",
							expanded
								? "flex-row gap-3 px-3 py-2 text-sm"
								: "flex-col justify-center gap-1 px-1 py-1.5 text-micro",
							isActive
								? "bg-primary/10 text-foreground"
								: "text-muted-foreground hover:bg-muted hover:text-foreground",
						)}
					>
						<span className="relative">
							<Icon className={cn("h-4 w-4 shrink-0", isActive && "text-primary")} />
							{showBadge && !expanded && (
								<span className="absolute -right-2 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-micro font-semibold text-primary-foreground">
									{unreadCount > 99 ? "99+" : unreadCount}
								</span>
							)}
						</span>
						<span className="truncate">{item.label}</span>
						{showBadge && expanded && (
							<span className="ml-auto flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-micro font-semibold text-primary-foreground">
								{unreadCount > 99 ? "99+" : unreadCount}
							</span>
						)}
					</Link>
				);
			})}
		</nav>
	);
}

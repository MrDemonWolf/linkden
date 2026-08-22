"use client";

import type { Route } from "next";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export interface SubTab {
	href: Route;
	label: string;
}

/**
 * Path-segment sub-tabs (`/admin/links` · `/admin/links/profile`): plain
 * Links styled as a tab strip, scrolling horizontally and never wrapping.
 * The longest matching href is the current one, so a destination root never
 * outranks its own child route. `useUnsavedChanges`' capture-phase click
 * guard covers these Links for free.
 */
export function SubTabs({
	items,
	ariaLabel = "Sections",
	className,
}: {
	items: readonly SubTab[];
	ariaLabel?: string;
	className?: string;
}) {
	const pathname = usePathname();
	const current = items.reduce<SubTab | null>((best, item) => {
		const matches = pathname === item.href || pathname.startsWith(`${item.href}/`);
		return matches && (!best || item.href.length > best.href.length) ? item : best;
	}, null);

	return (
		<nav
			aria-label={ariaLabel}
			className={cn(
				"-mx-6 mb-6 flex gap-1 overflow-x-auto border-b border-border px-6 [scrollbar-width:none] md:mx-0 md:px-0",
				className,
			)}
		>
			{items.map((item) => {
				const active = item === current;
				return (
					<Link
						key={item.href}
						href={item.href}
						aria-current={active ? "page" : undefined}
						// Static underline: a 2px foreground rule overlapping the strip's hairline.
						className={cn(
							"-mb-px flex min-h-11 shrink-0 items-center whitespace-nowrap border-b-2 px-3 text-xs transition-colors md:min-h-10",
							active
								? "border-foreground font-medium text-foreground"
								: "border-transparent text-muted-foreground hover:text-foreground",
						)}
					>
						{item.label}
					</Link>
				);
			})}
		</nav>
	);
}

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
	NAV_ROW_ACTIVE_CLASS,
	NAV_ROW_CLASS,
	NAV_ROW_IDLE_CLASS,
} from "@/components/admin/nav-list";
import { PageHeader } from "@/components/admin/page-header";
import { PageShell } from "@/components/admin/page-shell";
import { type SubTab, SubTabs } from "@/components/admin/sub-tabs";
import { cn } from "@/lib/utils";

const TABS: readonly SubTab[] = [
	{ href: "/admin/settings", label: "Account" },
	{ href: "/admin/settings/email", label: "Email" },
	{ href: "/admin/settings/integrations", label: "Integrations" },
	{ href: "/admin/settings/wallet", label: "Wallet" },
	{ href: "/admin/settings/data", label: "Data" },
];

/**
 * Settings shell: one h1, then the five sub-pages as path segments — a plain
 * vertical nav list beside the content at xl (same 40px rows as the sidebar,
 * no outer border), the scrolling SubTabs strip below xl. Each sub-page owns
 * its own form scope and StickySaveBar.
 */
export default function SettingsLayout({ children }: { children: React.ReactNode }) {
	const pathname = usePathname();
	// Longest matching href wins so the Account root never outranks a child.
	const current =
		TABS.filter((t) => pathname === t.href || pathname.startsWith(`${t.href}/`)).sort(
			(a, b) => b.href.length - a.href.length,
		)[0] ?? TABS[0];

	return (
		<PageShell>
			<PageHeader title="Settings" kicker={current.label} />
			<SubTabs items={TABS} ariaLabel="Settings sections" className="xl:hidden" />
			<div className="xl:grid xl:grid-cols-[176px_minmax(0,1fr)] xl:gap-8">
				{/* Plain Links so navigation stays a real anchor (unsaved-changes guard). */}
				<nav
					aria-label="Settings sections"
					className="sticky top-[calc(52px+1.5rem)] hidden flex-col gap-1 self-start xl:flex"
				>
					{TABS.map((tab) => {
						const active = tab === current;
						return (
							<Link
								key={tab.href}
								href={tab.href}
								aria-current={active ? "page" : undefined}
								className={cn(
									NAV_ROW_CLASS,
									"px-3 text-sm",
									active ? NAV_ROW_ACTIVE_CLASS : NAV_ROW_IDLE_CLASS,
								)}
							>
								{tab.label}
							</Link>
						);
					})}
				</nav>
				<div className="min-w-0">{children}</div>
			</div>
		</PageShell>
	);
}

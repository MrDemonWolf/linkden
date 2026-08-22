"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { PageHeader } from "@/components/admin/page-header";
import { PageShell } from "@/components/admin/page-shell";
import { type SubTab, SubTabs } from "@/components/admin/sub-tabs";
import { Button } from "@/components/ui/button";
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
 * 176px column of ghost Buttons beside the content at xl (no outer border, no
 * container chrome), the scrolling SubTabs strip below xl. Each sub-page owns
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
				{/* Ghost Buttons rendered AS Links, so navigation stays a real anchor
				    (the unsaved-changes guard hooks capture-phase clicks on <a>). */}
				<nav
					aria-label="Settings sections"
					className="sticky top-[calc(52px+1.5rem)] hidden flex-col gap-1 self-start xl:flex"
				>
					{TABS.map((tab) => {
						const active = tab === current;
						return (
							<Button
								key={tab.href}
								variant="ghost"
								size="lg"
								nativeButton={false}
								render={<Link href={tab.href} aria-current={active ? "page" : undefined} />}
								className={cn(
									"w-full justify-start px-3 text-sm md:text-sm xl:h-10",
									active
										? "bg-primary/10 font-medium text-foreground hover:bg-primary/10"
										: "text-muted-foreground",
								)}
							>
								{tab.label}
							</Button>
						);
					})}
				</nav>
				<div className="min-w-0">{children}</div>
			</div>
		</PageShell>
	);
}

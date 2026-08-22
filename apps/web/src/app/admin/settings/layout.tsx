"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { PageHeader } from "@/components/admin/page-header";
import { PageShell } from "@/components/admin/page-shell";
import { type SubTab, SubTabs } from "@/components/admin/sub-tabs";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

const TABS: readonly SubTab[] = [
	{ href: "/admin/settings", label: "Account" },
	{ href: "/admin/settings/email", label: "Email" },
	{ href: "/admin/settings/integrations", label: "Integrations" },
	{ href: "/admin/settings/wallet", label: "Wallet" },
	{ href: "/admin/settings/data", label: "Data" },
];

/**
 * Settings shell: one h1, then the five sub-pages as path segments —
 * vertical pills beside the content at xl, the scrolling SubTabs strip below.
 * Each sub-page owns its own form scope and StickySaveBar.
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
				{/* ponytail: Tabs is controlled by the pathname and each trigger renders a Link,
				    so the pill styling is reused and navigation stays a real anchor (unsaved guard). */}
				<Tabs value={current.href} orientation="vertical" className="hidden xl:block">
					<TabsList
						variant="pills"
						aria-label="Settings sections"
						className="sticky top-[68px] flex-col items-stretch gap-1"
					>
						{TABS.map((tab) => (
							<TabsTrigger
								key={tab.href}
								value={tab.href}
								render={<Link href={tab.href} />}
								nativeButton={false}
								className="min-h-10 justify-start rounded-lg px-3"
							>
								{tab.label}
							</TabsTrigger>
						))}
					</TabsList>
				</Tabs>
				<div className="min-w-0">{children}</div>
			</div>
		</PageShell>
	);
}

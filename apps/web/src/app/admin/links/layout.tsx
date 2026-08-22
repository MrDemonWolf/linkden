import { PageHeader } from "@/components/admin/page-header";
import { PageShell } from "@/components/admin/page-shell";
import { SubTabs } from "@/components/admin/sub-tabs";

const LINKS_TABS = [
	{ href: "/admin/links", label: "Blocks" },
	{ href: "/admin/links/profile", label: "Profile" },
	{ href: "/admin/links/social", label: "Social" },
] as const;

// ponytail: no kicker prop — the shell derives "LINKS / PROFILE" from the path segment.
export default function LinksLayout({ children }: { children: React.ReactNode }) {
	return (
		<PageShell>
			<PageHeader title="Links" />
			<SubTabs items={LINKS_TABS} ariaLabel="Links sections" />
			{children}
		</PageShell>
	);
}

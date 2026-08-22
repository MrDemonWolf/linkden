import { PageHeader } from "@/components/admin/page-header";
import { PageShell } from "@/components/admin/page-shell";
import { SubTabs } from "@/components/admin/sub-tabs";

const DESIGN_TABS = [
	{ href: "/admin/design", label: "Theme" },
	{ href: "/admin/design/banner", label: "Banner" },
	{ href: "/admin/design/branding", label: "Branding" },
	{ href: "/admin/design/seo", label: "SEO" },
] as const;

// ponytail: no kicker prop — the shell derives "DESIGN / SEO" from the path segment.
export default function DesignLayout({ children }: { children: React.ReactNode }) {
	return (
		<PageShell>
			<PageHeader title="Design" />
			<SubTabs items={DESIGN_TABS} ariaLabel="Design sections" />
			{children}
		</PageShell>
	);
}

import type { Route } from "next";
import { redirect } from "next/navigation";
import { AccountTab } from "@/components/admin/settings/account-tab";
import { legacyAdminPath } from "@/lib/admin-redirects";

// `/admin/settings` is the Account page. A legacy `?tab=` deep link is mapped
// to its new path segment here, on the server, so no page needs useSearchParams.
export default async function SettingsPage({
	searchParams,
}: {
	searchParams: Promise<{ tab?: string }>;
}) {
	const { tab } = await searchParams;
	if (tab) redirect(legacyAdminPath("/admin/settings", tab) as Route);
	return <AccountTab />;
}

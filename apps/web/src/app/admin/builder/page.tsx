import type { Route } from "next";
import { redirect } from "next/navigation";
import { legacyAdminPath } from "@/lib/admin-redirects";

// The Page Builder moved to /admin/links (`?tab=profile|social` → path segments).
export default async function BuilderRedirectPage({
	searchParams,
}: {
	searchParams: Promise<{ tab?: string }>;
}) {
	redirect(legacyAdminPath("/admin/builder", (await searchParams).tab) as Route);
}

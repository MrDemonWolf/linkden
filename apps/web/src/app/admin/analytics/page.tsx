import type { Route } from "next";
import { redirect } from "next/navigation";
import { legacyAdminPath } from "@/lib/admin-redirects";

// Analytics merged into Insights.
// Kept only as a redirect so bookmarks and deep links keep working.
export default function LegacyRedirectPage() {
	redirect(legacyAdminPath("/admin/analytics") as Route);
}

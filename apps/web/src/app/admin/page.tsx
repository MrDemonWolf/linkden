import type { Route } from "next";
import { redirect } from "next/navigation";
import { legacyAdminPath } from "@/lib/admin-redirects";

// Dashboard merged into Insights; /admin now lands on Links (the editor-first home).
// Kept only as a redirect so bookmarks and deep links keep working.
export default function LegacyRedirectPage() {
	redirect(legacyAdminPath("/admin") as Route);
}

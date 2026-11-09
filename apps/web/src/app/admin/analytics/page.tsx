import type { Route } from "next";
import { redirect } from "next/navigation";
import { legacyAdminPath } from "@/lib/admin-redirects";

// The retired analytics bookmark returns to profile authoring.
// Kept only as a redirect so bookmarks and deep links keep working.
export default function LegacyRedirectPage() {
	redirect(legacyAdminPath("/admin/analytics") as Route);
}

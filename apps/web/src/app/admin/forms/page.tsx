import type { Route } from "next";
import { redirect } from "next/navigation";
import { legacyAdminPath } from "@/lib/admin-redirects";

// The Forms inbox was merged into Connections, now Inbox.
// Kept only as a redirect so bookmarks and deep links keep working.
export default function LegacyRedirectPage() {
	redirect(legacyAdminPath("/admin/forms") as Route);
}

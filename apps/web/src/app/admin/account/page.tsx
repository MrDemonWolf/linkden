import type { Route } from "next";
import { redirect } from "next/navigation";
import { legacyAdminPath } from "@/lib/admin-redirects";

// Account moved to Settings (its root tab).
export default function AccountPage() {
	redirect(legacyAdminPath("/admin/account") as Route);
}

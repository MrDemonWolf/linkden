import type { Route } from "next";
import { redirect } from "next/navigation";
import { legacyAdminPath } from "@/lib/admin-redirects";

// Appearance moved to /admin/design (Theme · Banner · Branding · SEO).
export default function AppearanceRedirectPage() {
	redirect(legacyAdminPath("/admin/appearance") as Route);
}

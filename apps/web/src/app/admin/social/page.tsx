import type { Route } from "next";
import { redirect } from "next/navigation";
import { legacyAdminPath } from "@/lib/admin-redirects";

// Social editing lives under Links → Social; kept so old bookmarks keep working.
export default function SocialRedirectPage() {
	redirect(legacyAdminPath("/admin/social") as Route);
}

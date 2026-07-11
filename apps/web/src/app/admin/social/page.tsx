import { redirect } from "next/navigation";

// Social editing is now consolidated into the Page Builder's "Social Links"
// tab (the canonical, single social-editing UI). This standalone route is kept
// only as a redirect so any existing bookmarks or deep links keep working.
export default function SocialRedirectPage() {
	redirect("/admin/builder?tab=social");
}

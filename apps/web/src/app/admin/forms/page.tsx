import { redirect } from "next/navigation";

// The Forms inbox was merged into Connections (single canonical contact inbox).
// This route now permanently redirects to /admin/connections.
export default function FormsPage() {
	redirect("/admin/connections");
}

import type { Metadata, Viewport } from "next";
import { AdminShell } from "@/components/admin/admin-shell";

// The admin console installs as its own PWA ("LinkDen Admin", scope /admin);
// the public page's manifest lives at app/manifest.ts.
export const metadata: Metadata = {
	manifest: "/admin/manifest.webmanifest",
	appleWebApp: { capable: true, title: "LinkDen Admin", statusBarStyle: "black-translucent" },
};

// Overrides the public page's brand colour for the admin's dark chrome.
export const viewport: Viewport = { themeColor: "#0a0a0a" };

export default function AdminLayout({ children }: { children: React.ReactNode }) {
	return <AdminShell>{children}</AdminShell>;
}

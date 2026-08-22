import type { Metadata, Viewport } from "next";
import { AdminShell } from "@/components/admin/admin-shell";

// The admin console installs as its own PWA ("LinkDen Admin", scope /admin);
// the public page's manifest lives at app/manifest.ts.
export const metadata: Metadata = {
	manifest: "/admin/manifest.webmanifest",
	appleWebApp: { capable: true, title: "LinkDen Admin", statusBarStyle: "black-translucent" },
};

// Matches the shell chrome (`--sidebar`: card flattened over the background) so
// the PWA status bar blends into the top bar in both colour modes.
export const viewport: Viewport = {
	themeColor: [
		{ media: "(prefers-color-scheme: light)", color: "#ffffff" },
		{ media: "(prefers-color-scheme: dark)", color: "#15213d" },
	],
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
	return <AdminShell>{children}</AdminShell>;
}

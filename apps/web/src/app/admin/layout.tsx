import type { Metadata, Viewport } from "next";
import { Montserrat, Roboto } from "next/font/google";
import { AdminShell } from "@/components/admin/admin-shell";

const heading = Montserrat({
	subsets: ["latin"],
	variable: "--font-admin-display",
	display: "swap",
});
const body = Roboto({ subsets: ["latin"], variable: "--font-admin-sans", display: "swap" });

// The admin console installs as its own PWA ("LinkDen Admin", scope /admin);
// the public page's manifest lives at app/manifest.ts.
export const metadata: Metadata = {
	// Every admin route gets its own title (destination layouts below set the
	// segment name): WCAG 2.4.2, and Next's route announcer only speaks a client
	// navigation when document.title changes.
	title: { template: "%s · LinkDen Admin", default: "LinkDen Admin" },
	manifest: "/admin/manifest.webmanifest",
	appleWebApp: { capable: true, title: "LinkDen Admin", statusBarStyle: "black-translucent" },
};

// Matches the shell chrome (`--card`, which the 64px top bar paints)
// so the PWA status bar blends into the top bar in
// both colour modes. Keep these two in step with `--card` in `src/index.css`.
export const viewport: Viewport = {
	themeColor: [
		{ media: "(prefers-color-scheme: light)", color: "#FFFFFF" },
		{ media: "(prefers-color-scheme: dark)", color: "#18181B" },
	],
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
	return <AdminShell fontClassName={`${heading.variable} ${body.variable}`}>{children}</AdminShell>;
}

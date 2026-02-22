"use client";

import { usePathname } from "next/navigation";

// Full-page routes that DON'T use the 3-panel editor
const FULL_PAGE_ROUTES = [
  "/admin/analytics",
  "/admin/vcard",
  "/admin/wallet",
  "/admin/contacts",
  "/admin/pages",
  "/admin/links/new",
];

function isFullPageRoute(pathname: string) {
  return FULL_PAGE_ROUTES.some((route) => pathname === route || pathname.startsWith(`${route}/`));
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  // Full-page routes get a simple centered layout with back nav
  if (isFullPageRoute(pathname)) {
    return (
      <div className="min-h-screen bg-[var(--background)]">
        <header className="sticky top-0 z-20 flex items-center gap-3 px-4 md:px-6 py-3 glass-panel border-b border-[var(--surface-border)] rounded-none">
          <a
            href="/admin"
            className="text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
          >
            &larr; Back to Editor
          </a>
          <div className="flex-1" />
          <a href="/" target="_blank" rel="noopener noreferrer" className="glass-button text-sm">
            View Page
          </a>
        </header>
        <main className="max-w-4xl mx-auto p-4 md:p-6">{children}</main>
      </div>
    );
  }

  // The 3-panel editor is rendered by the admin page.tsx itself
  return <>{children}</>;
}

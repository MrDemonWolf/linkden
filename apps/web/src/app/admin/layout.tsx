"use client";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // All admin routes now render through the 3-panel editor
  // Sub-pages are accessed via drawers, not separate routes
  return <>{children}</>;
}

"use client";

import { PublicPage } from "@/components/public/public-page";
import { trpc } from "@/lib/trpc";

export default function HomePage() {
  const settingsQuery = trpc.settings.getPublic.useQuery();
  const linksQuery = trpc.links.list.useQuery();

  if (settingsQuery.isLoading || linksQuery.isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-brand-cyan border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (settingsQuery.error || linksQuery.error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="glass-card text-center max-w-md">
          <h2 className="text-xl font-semibold mb-2">Something went wrong</h2>
          <p className="text-[var(--text-secondary)]">
            Unable to load page data. Please try again later.
          </p>
        </div>
      </div>
    );
  }

  const settingsMap: Record<string, string> = {};
  if (settingsQuery.data) {
    for (const s of settingsQuery.data) {
      settingsMap[s.key] = s.value;
    }
  }

  return <PublicPage settings={settingsMap} links={linksQuery.data ?? []} />;
}

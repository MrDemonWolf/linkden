"use client";

import { PublicPage } from "@/components/public/public-page";
import {
  placeholderSettings,
} from "@/lib/placeholder-data";
import { trpc } from "@/lib/trpc";

const FIVE_MINUTES = 1000 * 60 * 5;
const ONE_HOUR = 1000 * 60 * 60;

export default function HomePage() {
  const settingsQuery = trpc.settings.getPublic.useQuery(undefined, {
    retry: 1,
    staleTime: FIVE_MINUTES,
    gcTime: ONE_HOUR,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
  const linksQuery = trpc.links.list.useQuery(undefined, {
    retry: 1,
    staleTime: FIVE_MINUTES,
    gcTime: ONE_HOUR,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  if (settingsQuery.isLoading || linksQuery.isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[var(--primary)] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Build settings map from server data, falling back to placeholder
  const settingsMap: Record<string, string> = { ...placeholderSettings };
  if (settingsQuery.data) {
    for (const s of settingsQuery.data) {
      settingsMap[s.key] = s.value;
    }
  }

  // Use server links — show empty state when no blocks exist
  const links = linksQuery.data ?? [];

  // Parse social links from settings
  let socialLinks: { platform: string; url: string }[] = [];
  try {
    const raw = settingsMap.socialLinks;
    if (raw) socialLinks = JSON.parse(raw);
  } catch {}

  return <PublicPage settings={settingsMap} links={links} socialLinks={socialLinks} />;
}

"use client";

import {
  ExternalLink,
  Mail,
  Phone,
  Contact,
  Wallet,
  ChevronRight,
} from "lucide-react";
import { trpc } from "@/lib/trpc";

interface LinkData {
  id: string;
  type: string;
  title: string;
  url: string;
  icon: string;
  iconType: string;
  isActive: boolean;
  clickCount: number;
  metadata: Record<string, unknown> | null;
}

interface LinkBlockProps {
  link: LinkData;
}

export function LinkBlock({ link }: LinkBlockProps) {
  const trackClick = trpc.links.trackClick.useMutation();

  function handleClick() {
    trackClick.mutate({
      id: link.id,
      referrer: typeof document !== "undefined" ? document.referrer : "",
    });
  }

  switch (link.type) {
    case "heading":
      return (
        <div className="py-2">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
            {link.title}
          </h2>
        </div>
      );

    case "spacer":
      return <div className="h-4" />;

    case "text":
      return (
        <div className="glass-card text-sm leading-relaxed text-[var(--text-secondary)]">
          {link.title !== "---" && (
            <h3 className="font-semibold text-[var(--text-primary)] mb-2">
              {link.title}
            </h3>
          )}
          <p>{link.url}</p>
        </div>
      );

    case "email":
      return (
        <a
          href={link.url.startsWith("mailto:") ? link.url : `mailto:${link.url}`}
          onClick={handleClick}
          className="glass-card flex items-center gap-3 group cursor-pointer hover:border-[var(--primary)] transition-all"
        >
          <div className="w-10 h-10 rounded-xl bg-[var(--button-bg)] flex items-center justify-center shrink-0">
            <Mail className="w-5 h-5 text-brand-cyan" />
          </div>
          <div className="flex-1 min-w-0">
            <span className="text-sm font-medium block truncate">
              {link.title}
            </span>
          </div>
          <ChevronRight className="w-4 h-4 text-[var(--text-secondary)] group-hover:text-[var(--primary)] transition-colors" />
        </a>
      );

    case "phone":
      return (
        <a
          href={link.url.startsWith("tel:") ? link.url : `tel:${link.url}`}
          onClick={handleClick}
          className="glass-card flex items-center gap-3 group cursor-pointer hover:border-[var(--primary)] transition-all"
        >
          <div className="w-10 h-10 rounded-xl bg-[var(--button-bg)] flex items-center justify-center shrink-0">
            <Phone className="w-5 h-5 text-brand-cyan" />
          </div>
          <div className="flex-1 min-w-0">
            <span className="text-sm font-medium block truncate">
              {link.title}
            </span>
          </div>
          <ChevronRight className="w-4 h-4 text-[var(--text-secondary)] group-hover:text-[var(--primary)] transition-colors" />
        </a>
      );

    case "vcard":
      return (
        <VCardDownloadBlock link={link} onTrack={handleClick} />
      );

    case "wallet":
      return (
        <button
          onClick={handleClick}
          className="glass-card flex items-center gap-3 group cursor-pointer hover:border-[var(--primary)] transition-all w-full text-left"
        >
          <div className="w-10 h-10 rounded-xl bg-[var(--button-bg)] flex items-center justify-center shrink-0">
            <Wallet className="w-5 h-5 text-brand-cyan" />
          </div>
          <div className="flex-1 min-w-0">
            <span className="text-sm font-medium block truncate">
              {link.title}
            </span>
          </div>
          <ChevronRight className="w-4 h-4 text-[var(--text-secondary)] group-hover:text-[var(--primary)] transition-colors" />
        </button>
      );

    case "link":
    default:
      return (
        <a
          href={link.url}
          target="_blank"
          rel="noopener noreferrer"
          onClick={handleClick}
          className="glass-card flex items-center gap-3 group cursor-pointer hover:border-[var(--primary)] transition-all"
        >
          <div className="w-10 h-10 rounded-xl bg-[var(--button-bg)] flex items-center justify-center shrink-0">
            {link.icon ? (
              <span className="text-xs font-bold text-brand-cyan">
                {link.icon.slice(0, 2).toUpperCase()}
              </span>
            ) : (
              <ExternalLink className="w-5 h-5 text-brand-cyan" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <span className="text-sm font-medium block truncate">
              {link.title}
            </span>
          </div>
          <ChevronRight className="w-4 h-4 text-[var(--text-secondary)] group-hover:text-[var(--primary)] transition-colors" />
        </a>
      );
  }
}

function VCardDownloadBlock({
  link,
  onTrack,
}: {
  link: LinkData;
  onTrack: () => void;
}) {
  const vcardQuery = trpc.vcard.download.useQuery(undefined, {
    enabled: false,
  });

  async function handleDownload() {
    onTrack();
    const result = await vcardQuery.refetch();
    if (result.data) {
      const blob = new Blob([result.data.content], { type: "text/vcard" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = result.data.fileName;
      a.click();
      URL.revokeObjectURL(url);
    }
  }

  return (
    <button
      onClick={handleDownload}
      className="glass-card flex items-center gap-3 group cursor-pointer hover:border-[var(--primary)] transition-all w-full text-left"
    >
      <div className="w-10 h-10 rounded-xl bg-[var(--button-bg)] flex items-center justify-center shrink-0">
        <Contact className="w-5 h-5 text-brand-cyan" />
      </div>
      <div className="flex-1 min-w-0">
        <span className="text-sm font-medium block truncate">{link.title}</span>
      </div>
      <ChevronRight className="w-4 h-4 text-[var(--text-secondary)] group-hover:text-[var(--primary)] transition-colors" />
    </button>
  );
}

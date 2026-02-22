"use client";

import { trpc } from "@/lib/trpc";
import {
  ChevronRight,
  Contact,
  ExternalLink,
  Github,
  Globe,
  type LucideIcon,
  Mail,
  Phone,
  Twitter,
} from "lucide-react";

const ICON_MAP: Record<string, LucideIcon> = {
  globe: Globe,
  github: Github,
  twitter: Twitter,
  mail: Mail,
  phone: Phone,
  contact: Contact,
};

interface LinkData {
  id: string;
  type: string;
  title: string;
  url: string | null;
  icon: string | null;
  iconType: string | null;
  isActive: boolean;
  clickCount: number;
  metadata: Record<string, unknown> | null;
}

interface LinkBlockProps {
  link: LinkData;
}

function LinkIcon({ icon }: { icon: string | null }) {
  if (!icon) return <ExternalLink className="w-5 h-5" />;
  const Icon = ICON_MAP[icon.toLowerCase()];
  if (Icon) return <Icon className="w-5 h-5" />;
  return <span className="text-xs font-bold">{icon.slice(0, 2).toUpperCase()}</span>;
}

export function LinkBlock({ link }: LinkBlockProps) {
  const trackClick = trpc.links.trackClick.useMutation();

  function handleClick() {
    if (link.id.startsWith("placeholder-")) return;
    trackClick.mutate({
      id: link.id,
      referrer: typeof document !== "undefined" ? document.referrer : "",
    });
  }

  switch (link.type) {
    case "heading":
      return (
        <div className="py-2 px-1">
          <h2 className="text-xs font-semibold uppercase tracking-[0.15em] text-[var(--text-secondary)]">
            {link.title}
          </h2>
        </div>
      );

    case "spacer":
      return <div className="h-4" />;

    case "text":
      return (
        <div className="rounded-2xl bg-white/8 border border-white/12 backdrop-blur-sm p-4 text-sm leading-relaxed text-[var(--text-secondary)]">
          {link.title !== "---" && (
            <h3 className="font-semibold text-[var(--text-primary)] mb-2">{link.title}</h3>
          )}
          <p>{link.url ?? ""}</p>
        </div>
      );

    case "email":
      return (
        <a
          href={link.url?.startsWith("mailto:") ? link.url : `mailto:${link.url ?? ""}`}
          onClick={handleClick}
          className="flex items-center gap-3 p-3.5 rounded-2xl bg-white/8 border border-white/12 backdrop-blur-sm hover:bg-white/12 hover:border-white/20 transition-all duration-200 group"
        >
          <div className="w-10 h-10 rounded-xl bg-[var(--primary)]/20 flex items-center justify-center shrink-0">
            <Mail className="w-5 h-5 text-[var(--primary)]" />
          </div>
          <span className="flex-1 text-sm font-medium truncate">{link.title}</span>
          <ChevronRight className="w-4 h-4 text-[var(--text-secondary)] group-hover:text-[var(--primary)] group-hover:translate-x-0.5 transition-all" />
        </a>
      );

    case "phone":
      return (
        <a
          href={link.url?.startsWith("tel:") ? link.url : `tel:${link.url ?? ""}`}
          onClick={handleClick}
          className="flex items-center gap-3 p-3.5 rounded-2xl bg-white/8 border border-white/12 backdrop-blur-sm hover:bg-white/12 hover:border-white/20 transition-all duration-200 group"
        >
          <div className="w-10 h-10 rounded-xl bg-[var(--primary)]/20 flex items-center justify-center shrink-0">
            <Phone className="w-5 h-5 text-[var(--primary)]" />
          </div>
          <span className="flex-1 text-sm font-medium truncate">{link.title}</span>
          <ChevronRight className="w-4 h-4 text-[var(--text-secondary)] group-hover:text-[var(--primary)] group-hover:translate-x-0.5 transition-all" />
        </a>
      );

    case "vcard":
      return <VCardDownloadBlock link={link} onTrack={handleClick} />;

    default:
      return (
        <a
          href={link.url ?? "#"}
          target="_blank"
          rel="noopener noreferrer"
          onClick={handleClick}
          className="flex items-center gap-3 p-3.5 rounded-2xl bg-white/8 border border-white/12 backdrop-blur-sm hover:bg-white/12 hover:border-white/20 transition-all duration-200 group"
        >
          <div className="w-10 h-10 rounded-xl bg-[var(--primary)]/20 flex items-center justify-center shrink-0 text-[var(--primary)]">
            <LinkIcon icon={link.icon} />
          </div>
          <span className="flex-1 text-sm font-medium truncate">{link.title}</span>
          <ChevronRight className="w-4 h-4 text-[var(--text-secondary)] group-hover:text-[var(--primary)] group-hover:translate-x-0.5 transition-all" />
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
      type="button"
      onClick={handleDownload}
      className="flex items-center gap-3 p-3.5 rounded-2xl bg-white/8 border border-white/12 backdrop-blur-sm hover:bg-white/12 hover:border-white/20 transition-all duration-200 group w-full text-left"
    >
      <div className="w-10 h-10 rounded-xl bg-[var(--primary)]/20 flex items-center justify-center shrink-0">
        <Contact className="w-5 h-5 text-[var(--primary)]" />
      </div>
      <span className="flex-1 text-sm font-medium truncate">{link.title}</span>
      <ChevronRight className="w-4 h-4 text-[var(--text-secondary)] group-hover:text-[var(--primary)] group-hover:translate-x-0.5 transition-all" />
    </button>
  );
}

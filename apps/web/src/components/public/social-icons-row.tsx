"use client";

import {
  Facebook,
  Github,
  Globe,
  Instagram,
  Linkedin,
  type LucideIcon,
  Twitter,
  Youtube,
} from "lucide-react";

const PLATFORM_ICONS: Record<string, LucideIcon> = {
  facebook: Facebook,
  instagram: Instagram,
  linkedin: Linkedin,
  twitter: Twitter,
  youtube: Youtube,
  github: Github,
  website: Globe,
};

interface SocialLink {
  platform: string;
  url: string;
}

interface SocialIconsRowProps {
  links: SocialLink[];
}

export function SocialIconsRow({ links }: SocialIconsRowProps) {
  if (!links.length) return null;

  return (
    <div className="flex items-center justify-center gap-3 py-2">
      {links.map((link) => {
        const Icon = PLATFORM_ICONS[link.platform] || Globe;
        return (
          <a
            key={link.platform}
            href={link.url}
            target="_blank"
            rel="noopener noreferrer"
            className="w-10 h-10 rounded-full bg-white/10 border border-white/15 flex items-center justify-center hover:bg-white/20 hover:scale-110 transition-all duration-200"
            title={link.platform}
          >
            <Icon className="w-4.5 h-4.5 text-white/80" />
          </a>
        );
      })}
    </div>
  );
}

"use client";

import { Search, X } from "lucide-react";
import { useState } from "react";

const BRAND_ICONS = [
  "github",
  "twitter",
  "linkedin",
  "instagram",
  "facebook",
  "youtube",
  "tiktok",
  "discord",
  "twitch",
  "spotify",
  "apple",
  "google",
  "amazon",
  "microsoft",
  "slack",
  "figma",
  "dribbble",
  "behance",
  "codepen",
  "stackoverflow",
  "reddit",
  "pinterest",
  "snapchat",
  "whatsapp",
  "telegram",
  "signal",
  "mastodon",
  "threads",
  "medium",
  "dev",
  "hashnode",
  "substack",
  "patreon",
  "kofi",
  "buymeacoffee",
  "paypal",
  "stripe",
  "shopify",
  "wordpress",
  "notion",
  "trello",
  "jira",
  "gitlab",
  "bitbucket",
  "npm",
  "docker",
  "kubernetes",
  "aws",
  "vercel",
  "netlify",
  "cloudflare",
  "firebase",
  "supabase",
  "planetscale",
  "mail",
  "globe",
  "phone",
  "map-pin",
  "calendar",
  "link",
  "music",
  "video",
  "camera",
  "book",
  "briefcase",
  "code",
  "database",
  "server",
  "shield",
  "star",
  "heart",
  "zap",
];

interface IconPickerProps {
  value: string;
  onChange: (value: string) => void;
  onClose: () => void;
}

export function IconPicker({ value, onChange, onClose }: IconPickerProps) {
  const [search, setSearch] = useState("");

  const filtered = BRAND_ICONS.filter((icon) => icon.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="glass-card w-80 max-h-96 overflow-hidden flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold">Choose Icon</h3>
        <button
          onClick={onClose}
          className="p-1 rounded hover:bg-[rgba(255,255,255,0.1)] transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="relative mb-3">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--text-secondary)]" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search icons..."
          className="glass-input pl-8 text-sm"
        />
      </div>

      <div className="overflow-y-auto flex-1 -mx-1">
        <div className="grid grid-cols-6 gap-1 p-1">
          {filtered.map((icon) => (
            <button
              key={icon}
              onClick={() => {
                onChange(icon);
                onClose();
              }}
              title={icon}
              className={`flex items-center justify-center w-10 h-10 rounded-lg text-xs font-medium transition-all ${
                value === icon
                  ? "bg-brand-cyan text-white"
                  : "hover:bg-[rgba(255,255,255,0.08)] text-[var(--text-secondary)]"
              }`}
            >
              <span className="truncate text-[10px]">{icon.slice(0, 3)}</span>
            </button>
          ))}
        </div>
        {filtered.length === 0 && (
          <p className="text-center text-sm text-[var(--text-secondary)] py-8">No icons found</p>
        )}
      </div>
    </div>
  );
}

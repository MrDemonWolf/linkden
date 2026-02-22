"use client";

import {
  BookOpen,
  ChevronDown,
  ExternalLink,
  Eye,
  Monitor,
  Moon,
  Smartphone,
  Sun,
  Tablet,
} from "lucide-react";
import { useState } from "react";

interface TopBarProps {
  deviceSize: "phone" | "tablet" | "desktop";
  onDeviceSizeChange: (size: "phone" | "tablet" | "desktop") => void;
  onPublish: () => void;
  onDiscardAll?: () => void;
  isPublishing: boolean;
  draftCount?: number;
  darkMode?: boolean;
  onToggleDarkMode?: () => void;
}

export function TopBar({
  deviceSize,
  onDeviceSizeChange,
  onPublish,
  onDiscardAll,
  isPublishing,
  draftCount = 0,
  darkMode,
  onToggleDarkMode,
}: TopBarProps) {
  const clerkEnabled = !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
  const [showPublishMenu, setShowPublishMenu] = useState(false);

  return (
    <header className="h-14 flex items-center justify-between px-4 bg-[var(--admin-surface)] border-b border-[var(--admin-border)] shrink-0">
      {/* Left: Logo */}
      <div className="flex items-center gap-4">
        <a href="/admin" className="flex items-center gap-1.5">
          <span className="text-lg font-bold text-[var(--admin-accent)]">Link</span>
          <span className="text-lg font-bold text-[var(--admin-text)]">Den</span>
        </a>
      </div>

      {/* Center: Device toggles */}
      <div className="hidden md:flex items-center gap-2">
        <div className="flex items-center bg-[var(--admin-bg)] rounded-lg p-0.5">
          {([
            { key: "phone" as const, icon: Smartphone, title: "Phone preview" },
            { key: "tablet" as const, icon: Tablet, title: "Tablet preview" },
            { key: "desktop" as const, icon: Monitor, title: "Desktop preview" },
          ]).map(({ key, icon: Icon, title }) => (
            <button
              key={key}
              type="button"
              onClick={() => onDeviceSizeChange(key)}
              className={`p-1.5 rounded-md transition-colors ${
                deviceSize === key
                  ? "bg-[var(--admin-surface)] text-[var(--admin-accent)] shadow-sm"
                  : "text-[var(--admin-text-secondary)] hover:text-[var(--admin-text)]"
              }`}
              title={title}
            >
              <Icon className="w-4 h-4" />
            </button>
          ))}
        </div>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-2">
        {onToggleDarkMode && (
          <button
            type="button"
            onClick={onToggleDarkMode}
            className="p-1.5 rounded-lg text-[var(--admin-text-secondary)] hover:text-[var(--admin-text)] hover:bg-[var(--admin-bg)] transition-colors"
            title={darkMode ? "Light mode" : "Dark mode"}
          >
            {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
        )}

        <a
          href="/"
          target="_blank"
          rel="noopener noreferrer"
          className="hidden sm:flex items-center gap-1.5 text-sm text-[var(--admin-text-secondary)] hover:text-[var(--admin-text)] px-2.5 py-1.5 rounded-lg hover:bg-[var(--admin-bg)] transition-colors"
        >
          <Eye className="w-3.5 h-3.5" />
          Preview
        </a>

        <a
          href="https://mrdemonwolf.github.io/linkden/"
          target="_blank"
          rel="noopener noreferrer"
          className="hidden sm:flex items-center gap-1.5 text-sm text-[var(--admin-text-secondary)] hover:text-[var(--admin-text)] px-2.5 py-1.5 rounded-lg hover:bg-[var(--admin-bg)] transition-colors"
        >
          <BookOpen className="w-3.5 h-3.5" />
          Docs
        </a>

        {clerkEnabled && <ClerkUserButton />}

        {/* Publish button with dropdown */}
        <div className="relative">
          <div className="flex items-center">
            <button
              type="button"
              onClick={onPublish}
              disabled={isPublishing || draftCount === 0}
              className={`text-white text-sm font-medium px-4 py-2 rounded-l-lg transition-colors disabled:opacity-50 ${
                draftCount > 0
                  ? "bg-[var(--admin-accent)] hover:bg-[var(--admin-accent-hover)] animate-pulse-subtle"
                  : "bg-[var(--admin-accent)] hover:bg-[var(--admin-accent-hover)]"
              }`}
            >
              {isPublishing ? "Publishing..." : draftCount > 0 ? `Publish (${draftCount})` : "Publish"}
            </button>
            {onDiscardAll && draftCount > 0 && (
              <button
                type="button"
                onClick={() => setShowPublishMenu(!showPublishMenu)}
                className="bg-[var(--admin-accent)] hover:bg-[var(--admin-accent-hover)] text-white px-1.5 py-2 rounded-r-lg border-l border-white/20 transition-colors"
              >
                <ChevronDown className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          {showPublishMenu && (
            <div className="absolute right-0 top-full mt-1 bg-[var(--admin-surface)] border border-[var(--admin-border)] rounded-lg shadow-lg py-1 min-w-[160px] z-50">
              <button
                type="button"
                onClick={() => {
                  onPublish();
                  setShowPublishMenu(false);
                }}
                className="w-full text-left px-3 py-2 text-sm text-[var(--admin-text)] hover:bg-[var(--admin-bg)] transition-colors"
              >
                Publish All
              </button>
              <button
                type="button"
                onClick={() => {
                  onDiscardAll?.();
                  setShowPublishMenu(false);
                }}
                className="w-full text-left px-3 py-2 text-sm text-red-500 hover:bg-[var(--admin-bg)] transition-colors"
              >
                Discard All Changes
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

function ClerkUserButton() {
  try {
    const { UserButton } = require("@clerk/nextjs");
    return <UserButton afterSignOutUrl="/" appearance={{ elements: { avatarBox: "w-8 h-8" } }} />;
  } catch {
    return null;
  }
}

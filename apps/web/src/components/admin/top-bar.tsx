"use client";

import {
  BookOpen,
  ChevronDown,
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
    <header className="h-[52px] flex items-center justify-between px-4 bg-[var(--admin-surface)] border-b border-[var(--admin-border)] shrink-0" style={{ boxShadow: "var(--admin-shadow-sm)" }}>
      {/* Left: Logo */}
      <div className="flex items-center gap-4">
        <a href="/admin" className="flex items-center gap-0.5 group">
          <span className="text-base font-bold tracking-tight text-[var(--admin-accent)] transition-colors group-hover:text-[var(--admin-accent-hover)]">Link</span>
          <span className="text-base font-bold tracking-tight text-[var(--admin-text)]">Den</span>
        </a>
      </div>

      {/* Center: Device toggles */}
      <div className="hidden md:flex items-center gap-2">
        <div className="flex items-center bg-[var(--admin-bg)] rounded-lg p-0.5 border border-[var(--admin-border-subtle)]">
          {([
            { key: "phone" as const, icon: Smartphone, title: "Phone" },
            { key: "tablet" as const, icon: Tablet, title: "Tablet" },
            { key: "desktop" as const, icon: Monitor, title: "Desktop" },
          ]).map(({ key, icon: Icon, title }) => (
            <button
              key={key}
              type="button"
              onClick={() => onDeviceSizeChange(key)}
              className={`p-1.5 rounded-md transition-all duration-150 ${
                deviceSize === key
                  ? "bg-[var(--admin-surface)] text-[var(--admin-accent)] shadow-sm"
                  : "text-[var(--admin-text-tertiary)] hover:text-[var(--admin-text-secondary)]"
              }`}
              title={title}
            >
              <Icon className="w-4 h-4" />
            </button>
          ))}
        </div>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-1.5">
        {onToggleDarkMode && (
          <button
            type="button"
            onClick={onToggleDarkMode}
            className="p-2 rounded-lg text-[var(--admin-text-tertiary)] hover:text-[var(--admin-text)] hover:bg-[var(--admin-accent-subtle)] transition-all duration-150"
            title={darkMode ? "Light mode" : "Dark mode"}
          >
            {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
        )}

        <a
          href="/"
          target="_blank"
          rel="noopener noreferrer"
          className="hidden sm:flex items-center gap-1.5 text-xs font-medium text-[var(--admin-text-secondary)] hover:text-[var(--admin-text)] px-2.5 py-1.5 rounded-lg hover:bg-[var(--admin-accent-subtle)] transition-all duration-150"
        >
          <Eye className="w-3.5 h-3.5" />
          Preview
        </a>

        <a
          href="https://mrdemonwolf.github.io/linkden/"
          target="_blank"
          rel="noopener noreferrer"
          className="hidden sm:flex items-center gap-1.5 text-xs font-medium text-[var(--admin-text-secondary)] hover:text-[var(--admin-text)] px-2.5 py-1.5 rounded-lg hover:bg-[var(--admin-accent-subtle)] transition-all duration-150"
        >
          <BookOpen className="w-3.5 h-3.5" />
          Docs
        </a>

        {clerkEnabled && <ClerkUserButton />}

        {/* Publish button with dropdown */}
        <div className="relative ml-1">
          <div className="flex items-center">
            <button
              type="button"
              onClick={onPublish}
              disabled={isPublishing || draftCount === 0}
              className={`text-white text-xs font-semibold px-4 py-2 transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed ${
                onDiscardAll && draftCount > 0 ? "rounded-l-lg" : "rounded-lg"
              } ${
                draftCount > 0
                  ? "bg-[var(--admin-accent)] hover:bg-[var(--admin-accent-hover)] shadow-sm hover:shadow-md"
                  : "bg-[var(--admin-accent)] hover:bg-[var(--admin-accent-hover)]"
              }`}
            >
              {isPublishing ? (
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Publishing
                </span>
              ) : draftCount > 0 ? (
                <span className="flex items-center gap-1.5">
                  Publish
                  <span className="bg-white/20 text-[10px] px-1.5 py-0.5 rounded-full font-bold">{draftCount}</span>
                </span>
              ) : (
                "Publish"
              )}
            </button>
            {onDiscardAll && draftCount > 0 && (
              <button
                type="button"
                onClick={() => setShowPublishMenu(!showPublishMenu)}
                className="bg-[var(--admin-accent)] hover:bg-[var(--admin-accent-hover)] text-white px-1.5 py-2 rounded-r-lg border-l border-white/20 transition-colors"
              >
                <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-150 ${showPublishMenu ? "rotate-180" : ""}`} />
              </button>
            )}
          </div>
          {showPublishMenu && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowPublishMenu(false)} />
              <div className="absolute right-0 top-full mt-1.5 bg-[var(--admin-surface)] border border-[var(--admin-border)] rounded-lg py-1 min-w-[170px] z-50" style={{ boxShadow: "var(--admin-shadow-lg)" }}>
                <button
                  type="button"
                  onClick={() => {
                    onPublish();
                    setShowPublishMenu(false);
                  }}
                  className="w-full text-left px-3 py-2 text-xs font-medium text-[var(--admin-text)] hover:bg-[var(--admin-accent-subtle)] transition-colors rounded-sm"
                >
                  Publish All
                </button>
                <div className="my-1 border-t border-[var(--admin-border)]" />
                <button
                  type="button"
                  onClick={() => {
                    onDiscardAll?.();
                    setShowPublishMenu(false);
                  }}
                  className="w-full text-left px-3 py-2 text-xs font-medium text-[var(--admin-danger)] hover:bg-red-50 transition-colors rounded-sm"
                >
                  Discard All Changes
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

function ClerkUserButton() {
  try {
    const { UserButton } = require("@clerk/nextjs");
    return <UserButton afterSignOutUrl="/" appearance={{ elements: { avatarBox: "w-7 h-7" } }} />;
  } catch {
    return null;
  }
}

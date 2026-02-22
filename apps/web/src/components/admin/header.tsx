"use client";

import { ExternalLink } from "lucide-react";

const clerkEnabled = !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

function ClerkUserButton() {
  if (!clerkEnabled) return null;
  // Dynamic require so it doesn't error when Clerk is not installed/configured
  const { UserButton } = require("@clerk/nextjs");
  return (
    <UserButton
      afterSignOutUrl="/"
      appearance={{
        elements: {
          avatarBox: "w-8 h-8",
        },
      }}
    />
  );
}

export function Header() {
  return (
    <header className="sticky top-0 z-20 flex items-center justify-between px-4 md:px-6 py-3 glass-panel border-b border-[var(--surface-border)] rounded-none">
      <div className="lg:hidden w-10" />

      <div className="flex-1" />

      <div className="flex items-center gap-3">
        <a
          href="/"
          target="_blank"
          rel="noopener noreferrer"
          className="glass-button flex items-center gap-2 text-sm"
        >
          <ExternalLink className="w-3.5 h-3.5" />
          View Page
        </a>
        <ClerkUserButton />
      </div>
    </header>
  );
}

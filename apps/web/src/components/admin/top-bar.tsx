"use client";

import { BookOpen, ExternalLink, Eye, Monitor, Redo2, Smartphone, Tablet, Undo2 } from "lucide-react";

interface TopBarProps {
  deviceSize: "phone" | "tablet" | "desktop";
  onDeviceSizeChange: (size: "phone" | "tablet" | "desktop") => void;
  onPublish: () => void;
  isPublishing: boolean;
}

export function TopBar({ deviceSize, onDeviceSizeChange, onPublish, isPublishing }: TopBarProps) {
  const clerkEnabled = !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

  return (
    <header className="h-14 flex items-center justify-between px-4 bg-white border-b border-gray-200 shrink-0">
      {/* Left: Logo */}
      <div className="flex items-center gap-4">
        <a href="/admin" className="flex items-center gap-1.5">
          <span className="text-lg font-bold text-indigo-600">Link</span>
          <span className="text-lg font-bold text-gray-900">Den</span>
        </a>
      </div>

      {/* Center: Device toggles + URL */}
      <div className="hidden md:flex items-center gap-2">
        <div className="flex items-center bg-gray-100 rounded-lg p-0.5">
          <button
            type="button"
            onClick={() => onDeviceSizeChange("phone")}
            className={`p-1.5 rounded-md transition-colors ${
              deviceSize === "phone"
                ? "bg-white text-indigo-600 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
            title="Phone preview"
          >
            <Smartphone className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => onDeviceSizeChange("tablet")}
            className={`p-1.5 rounded-md transition-colors ${
              deviceSize === "tablet"
                ? "bg-white text-indigo-600 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
            title="Tablet preview"
          >
            <Tablet className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => onDeviceSizeChange("desktop")}
            className={`p-1.5 rounded-md transition-colors ${
              deviceSize === "desktop"
                ? "bg-white text-indigo-600 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
            title="Desktop preview"
          >
            <Monitor className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center gap-1 text-gray-400">
          <button
            type="button"
            className="p-1.5 rounded-md hover:bg-gray-100 hover:text-gray-600 transition-colors"
            title="Undo"
          >
            <Undo2 className="w-4 h-4" />
          </button>
          <button
            type="button"
            className="p-1.5 rounded-md hover:bg-gray-100 hover:text-gray-600 transition-colors"
            title="Redo"
          >
            <Redo2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-2">
        <a
          href="/"
          target="_blank"
          rel="noopener noreferrer"
          className="hidden sm:flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900 px-2.5 py-1.5 rounded-lg hover:bg-gray-100 transition-colors"
        >
          <Eye className="w-3.5 h-3.5" />
          Preview
        </a>

        <a
          href="/"
          target="_blank"
          rel="noopener noreferrer"
          className="hidden sm:flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900 px-2.5 py-1.5 rounded-lg hover:bg-gray-100 transition-colors"
        >
          <ExternalLink className="w-3.5 h-3.5" />
          View Page
        </a>

        <a
          href="https://linkden-docs.pages.dev"
          target="_blank"
          rel="noopener noreferrer"
          className="hidden sm:flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900 px-2.5 py-1.5 rounded-lg hover:bg-gray-100 transition-colors"
        >
          <BookOpen className="w-3.5 h-3.5" />
          Docs
        </a>

        {clerkEnabled && <ClerkUserButton />}

        <button
          type="button"
          onClick={onPublish}
          disabled={isPublishing}
          className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
        >
          {isPublishing ? "Publishing..." : "Publish"}
        </button>
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

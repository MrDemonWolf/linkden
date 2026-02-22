"use client";

import { Moon, Sun } from "lucide-react";

interface ThemeToggleProps {
  isDark: boolean;
  onToggle: () => void;
  size?: "sm" | "md";
  className?: string;
}

export function ThemeToggle({ isDark, onToggle, size = "md", className = "" }: ThemeToggleProps) {
  const iconSize = size === "sm" ? "w-3.5 h-3.5" : "w-4 h-4";
  const buttonSize = size === "sm" ? "w-7 h-7" : "w-8 h-8";

  return (
    <button
      type="button"
      onClick={onToggle}
      className={`${buttonSize} rounded-full flex items-center justify-center transition-colors hover:bg-white/10 ${className}`}
      title={isDark ? "Switch to light mode" : "Switch to dark mode"}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
    >
      {isDark ? <Sun className={iconSize} /> : <Moon className={iconSize} />}
    </button>
  );
}

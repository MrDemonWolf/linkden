"use client";

import { Moon, Sun } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Avatar } from "./avatar";
import { LinkBlock } from "./link-block";
import { SocialIconsRow } from "./social-icons-row";
import { WhitelabelFooter } from "./whitelabel-footer";

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

interface SocialLink {
  platform: string;
  url: string;
}

interface PublicPageProps {
  settings: Record<string, string>;
  links: LinkData[];
  socialLinks?: SocialLink[];
  isPreview?: boolean;
}

const VISITOR_THEME_KEY = "linkden-visitor-theme";

export function PublicPage({
  settings,
  links,
  socialLinks = [],
  isPreview = false,
}: PublicPageProps) {
  const profileName = settings.profileName || "LinkDen";
  const profileBio = settings.profileBio || "";
  const profileImage = settings.profileImage || "";
  const captchaSiteKey = settings.captchaSiteKey || "";
  const customCss = settings.customCss || "";
  const customHead = settings.customHead || "";
  const brandName = settings.brandName || "";
  const brandLogo = settings.brandLogo || "";
  const accentColor = settings.accentColor || "#0FACED";
  const backgroundColor = settings.backgroundColor || "#091533";
  const showVerifiedBadge = settings.verifiedBadge === "true";
  const themeMode = settings.themeMode || "dark";

  // Visitor dark/light preference
  const [visitorMode, setVisitorMode] = useState<"dark" | "light" | null>(null);

  useEffect(() => {
    if (isPreview) return;
    const stored = localStorage.getItem(VISITOR_THEME_KEY) as "dark" | "light" | null;
    if (stored) setVisitorMode(stored);
  }, [isPreview]);

  const toggleVisitorMode = useCallback(() => {
    const currentMode = visitorMode || themeMode;
    const next = currentMode === "dark" ? "light" : "dark";
    setVisitorMode(next);
    if (!isPreview) {
      localStorage.setItem(VISITOR_THEME_KEY, next);
    }
  }, [visitorMode, themeMode, isPreview]);

  // Apply theme CSS variables from settings
  useEffect(() => {
    if (isPreview) return;
    const root = document.documentElement;
    const themeSettings: Record<string, string> = {
      backgroundColor: "--background",
      textColor: "--text-primary",
      accentColor: "--primary",
    };

    for (const [key, cssVar] of Object.entries(themeSettings)) {
      if (settings[key]) {
        root.style.setProperty(cssVar, settings[key]);
      }
    }

    if (customCss) {
      const style = document.createElement("style");
      style.id = "linkden-custom-css";
      style.textContent = customCss;
      document.head.appendChild(style);
      return () => {
        const el = document.getElementById("linkden-custom-css");
        if (el) el.remove();
      };
    }
  }, [settings, customCss, isPreview]);

  // Inject custom head tags
  useEffect(() => {
    if (isPreview || !customHead) return;
    const div = document.createElement("div");
    div.id = "linkden-custom-head";
    div.innerHTML = customHead;
    const children = Array.from(div.children);
    for (const child of children) {
      document.head.appendChild(child);
    }
    return () => {
      for (const child of children) {
        if (child.parentNode === document.head) {
          document.head.removeChild(child);
        }
      }
    };
  }, [customHead, isPreview]);

  // Update document title and meta
  useEffect(() => {
    if (isPreview) return;
    const metaTitle = settings.metaTitle || profileName;
    const metaDescription = settings.metaDescription || profileBio;
    const metaImage = settings.metaImage || profileImage;

    document.title = metaTitle;

    function setMeta(name: string, content: string) {
      if (!content) return;
      let meta = document.querySelector(
        `meta[name="${name}"], meta[property="${name}"]`,
      ) as HTMLMetaElement;
      if (!meta) {
        meta = document.createElement("meta");
        if (name.startsWith("og:") || name.startsWith("twitter:")) {
          meta.setAttribute("property", name);
        } else {
          meta.setAttribute("name", name);
        }
        document.head.appendChild(meta);
      }
      meta.content = content;
    }

    setMeta("description", metaDescription);
    setMeta("og:title", metaTitle);
    setMeta("og:description", metaDescription);
    setMeta("og:image", metaImage);
    setMeta("twitter:card", "summary_large_image");
    setMeta("twitter:title", metaTitle);
    setMeta("twitter:description", metaDescription);
    setMeta("twitter:image", metaImage);
  }, [settings, profileName, profileBio, profileImage, isPreview]);

  // Track page view via tRPC mutation
  useEffect(() => {
    if (isPreview) return;
    const apiUrl = process.env.NEXT_PUBLIC_API_URL;
    if (!apiUrl) return;
    fetch(`${apiUrl}/trpc/analytics.trackPageView`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ json: { referrer: document.referrer } }),
    }).catch(() => {});
  }, [isPreview]);

  const activeLinks = links.filter((l) => l.isActive);

  return (
    <div
      className="min-h-screen flex flex-col relative"
      style={isPreview ? { background: backgroundColor, color: "var(--text-primary)" } : undefined}
    >
      {/* Gradient Header Area */}
      <div
        className="relative w-full pt-16 pb-24 px-4"
        style={{
          background: `linear-gradient(135deg, ${accentColor}22 0%, ${backgroundColor} 50%, ${accentColor}11 100%)`,
        }}
      >
        <div className="absolute inset-0 opacity-30" />
      </div>

      {/* Content Area - overlaps header */}
      <div className="flex flex-col items-center px-4 -mt-16 pb-12">
        <div className="w-full max-w-md space-y-5 animate-fade-in">
          {/* Avatar */}
          <div className="flex justify-center">
            <div className="rounded-full p-1 bg-[var(--background)] shadow-xl">
              <Avatar
                src={profileImage}
                alt={profileName}
                size={104}
                verified={showVerifiedBadge}
              />
            </div>
          </div>

          {/* Name & Bio */}
          <div className="text-center">
            <h1 className="text-2xl font-bold tracking-tight">{profileName}</h1>
            {profileBio && (
              <p className="text-sm text-[var(--text-secondary)] mt-2 max-w-xs mx-auto leading-relaxed">
                {profileBio}
              </p>
            )}
          </div>

          {/* Social Icons Row */}
          {socialLinks.length > 0 && <SocialIconsRow links={socialLinks} />}

          {/* Link Blocks */}
          <div className="space-y-3">
            {activeLinks.map((link) => (
              <LinkBlock key={link.id} link={link} captchaSiteKey={captchaSiteKey} />
            ))}
          </div>

          {/* Footer */}
          <WhitelabelFooter brandName={brandName} brandLogo={brandLogo} />
        </div>
      </div>

      {/* Floating dark/light toggle for visitors */}
      {!isPreview && (
        <button
          type="button"
          onClick={toggleVisitorMode}
          className="fixed bottom-4 right-4 w-10 h-10 rounded-full bg-white/10 border border-white/20 backdrop-blur-sm flex items-center justify-center text-white/70 hover:text-white hover:bg-white/20 transition-all z-50"
          aria-label="Toggle dark/light mode"
        >
          {(visitorMode || themeMode) === "dark" ? (
            <Sun className="w-4 h-4" />
          ) : (
            <Moon className="w-4 h-4" />
          )}
        </button>
      )}
    </div>
  );
}

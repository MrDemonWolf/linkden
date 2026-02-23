"use client";

import { getTheme, type ThemeVariant } from "@linkden/ui/themes";
import { DragDropContext, Draggable, type DropResult, Droppable } from "@hello-pangea/dnd";
import { BadgeCheck, GripVertical, Moon, Sun } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
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
  isDraggable?: boolean;
  onReorder?: (sourceIndex: number, destIndex: number) => void;
}

const VISITOR_THEME_KEY = "linkden-visitor-theme";

export function PublicPage({
  settings,
  links,
  socialLinks = [],
  isPreview = false,
  isDraggable = false,
  onReorder,
}: PublicPageProps) {
  const profileName = settings.profileName || "LinkDen";
  const profileBio = settings.profileBio || "";
  const profileImage = settings.profileImage || "";
  const captchaSiteKey = settings.captchaSiteKey || "";
  const captchaType = settings.captchaType || "none";
  const customCss = settings.customCss || "";
  const customHead = settings.customHead || "";
  const brandName = settings.brandName || "";
  const brandLogo = settings.brandLogo || "";
  const brandEnabled = settings.brandEnabled !== "false";
  const accentColor = settings.accentColor || "#0FACED";
  const backgroundColor = settings.backgroundColor || "#091533";
  const showVerifiedBadge = settings.verifiedBadge === "true";
  const themeMode = settings.themeMode || "dark";
  const themeId = settings.theme || "midnight-glass";

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

  // Resolve the effective mode and theme variant colors
  const effectiveMode = (visitorMode || themeMode) as "dark" | "light";
  const themeVariant: ThemeVariant | null = useMemo(() => {
    const theme = getTheme(themeId);
    if (!theme) return null;
    return theme[effectiveMode === "light" ? "light" : "dark"];
  }, [themeId, effectiveMode]);

  // Effective colors: use theme variant if available, otherwise fall back to settings
  const effectiveBg = themeVariant?.background || backgroundColor;
  const effectiveText = themeVariant?.textPrimary || settings.textColor || "rgba(255,255,255,0.95)";
  const effectiveAccent = themeVariant?.primary || accentColor;
  const isLightMode = effectiveMode === "light";

  // Apply theme CSS variables from settings
  useEffect(() => {
    if (isPreview) return;
    const root = document.documentElement;
    root.style.setProperty("--background", effectiveBg);
    root.style.setProperty("--text-primary", effectiveText);
    root.style.setProperty("--primary", effectiveAccent);
    if (themeVariant) {
      root.style.setProperty("--text-secondary", themeVariant.textSecondary);
      root.style.setProperty("--surface", themeVariant.surface);
      root.style.setProperty("--surface-border", themeVariant.surfaceBorder);
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
  }, [effectiveBg, effectiveText, effectiveAccent, themeVariant, customCss, isPreview]);

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

  function handleDragEnd(result: DropResult) {
    if (!result.destination || !onReorder) return;
    if (result.source.index === result.destination.index) return;
    onReorder(result.source.index, result.destination.index);
  }

  const linkBlocksContent = isDraggable ? (
    <DragDropContext onDragEnd={handleDragEnd}>
      <Droppable droppableId="preview-blocks">
        {(provided) => (
          <div ref={provided.innerRef} {...provided.droppableProps} className="space-y-3">
            {activeLinks.map((link, index) => (
              <Draggable key={link.id} draggableId={link.id} index={index}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.draggableProps}
                    className={`relative group ${snapshot.isDragging ? "z-50 opacity-90" : ""}`}
                  >
                    <div
                      {...provided.dragHandleProps}
                      className="absolute -left-6 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-60 hover:!opacity-100 transition-opacity cursor-grab active:cursor-grabbing z-10"
                    >
                      <GripVertical className="w-4 h-4 text-[var(--text-secondary)]" />
                    </div>
                    <LinkBlock link={link} captchaSiteKey={captchaSiteKey} captchaType={captchaType} />
                  </div>
                )}
              </Draggable>
            ))}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </DragDropContext>
  ) : (
    <div className="space-y-3">
      {activeLinks.map((link) => (
        <LinkBlock key={link.id} link={link} captchaSiteKey={captchaSiteKey} captchaType={captchaType} />
      ))}
    </div>
  );

  return (
    <div
      className={`${isPreview ? "min-h-full" : "min-h-screen"} flex flex-col relative transition-colors duration-300`}
      style={isPreview ? {
        background: effectiveBg,
        color: effectiveText,
        ["--background" as string]: effectiveBg,
        ["--text-primary" as string]: effectiveText,
        ["--text-secondary" as string]: themeVariant?.textSecondary || "rgba(255,255,255,0.55)",
        ["--primary" as string]: effectiveAccent,
        ["--surface" as string]: themeVariant?.surface || "rgba(255,255,255,0.08)",
        ["--surface-border" as string]: themeVariant?.surfaceBorder || "rgba(255,255,255,0.12)",
      } : undefined}
    >
      {/* Gradient Header Area */}
      <div
        className="relative w-full pt-16 pb-24 px-4"
        style={{
          background: isLightMode
            ? `linear-gradient(135deg, ${effectiveAccent}30 0%, ${effectiveAccent}18 40%, ${effectiveBg} 100%)`
            : `linear-gradient(135deg, ${effectiveAccent}22 0%, ${effectiveBg} 50%, ${effectiveAccent}11 100%)`,
        }}
      >
        <div className="absolute inset-0 opacity-30" />
      </div>

      {/* Content Area - overlaps header */}
      <main className="flex flex-col items-center px-4 -mt-16 pb-12" role="main">
        <div className={`w-full space-y-5 animate-fade-in ${isPreview ? "" : "max-w-md"}`}>
          {/* Avatar */}
          <div className="flex justify-center">
            <div className="rounded-full p-1 bg-[var(--background)] shadow-xl">
              <Avatar
                src={profileImage}
                alt={profileName}
                size={104}
              />
            </div>
          </div>

          {/* Name & Bio */}
          <div className="text-center">
            <h1 className="text-2xl font-bold tracking-tight inline-flex items-center justify-center gap-1.5">
              {profileName}
              {showVerifiedBadge && (
                <BadgeCheck className="w-5 h-5 text-blue-500 shrink-0" aria-label="Verified" />
              )}
            </h1>
            {profileBio && (
              <p className="text-sm text-[var(--text-secondary)] mt-2 max-w-xs mx-auto leading-relaxed">
                {profileBio}
              </p>
            )}
          </div>

          {/* Social Icons Row */}
          {socialLinks.length > 0 && <SocialIconsRow links={socialLinks} />}

          {/* Link Blocks */}
          {linkBlocksContent}

          {/* Footer */}
          {brandEnabled && <WhitelabelFooter brandName={brandName} brandLogo={brandLogo} />}
        </div>
      </main>

      {/* Floating dark/light toggle for visitors (and preview) */}
      <button
        type="button"
        onClick={toggleVisitorMode}
        className={`${isPreview ? "absolute" : "fixed"} bottom-4 right-4 w-10 h-10 rounded-full backdrop-blur-sm flex items-center justify-center transition-all z-50 shadow-lg ${
          isLightMode
            ? "bg-black/8 border border-black/15 text-black/50 hover:text-black/80 hover:bg-black/15"
            : "bg-white/10 border border-white/20 text-white/70 hover:text-white hover:bg-white/20"
        }`}
        aria-label={isLightMode ? "Switch to dark mode" : "Switch to light mode"}
      >
        {effectiveMode === "dark" ? (
          <Sun className="w-4 h-4" />
        ) : (
          <Moon className="w-4 h-4" />
        )}
      </button>
    </div>
  );
}

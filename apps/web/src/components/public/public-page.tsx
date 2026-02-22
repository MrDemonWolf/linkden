"use client";

import { useEffect } from "react";
import { Avatar } from "./avatar";
import { ContactForm } from "./contact-form";
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

export function PublicPage({
  settings,
  links,
  socialLinks = [],
  isPreview = false,
}: PublicPageProps) {
  const profileName = settings.profileName || "LinkDen";
  const profileBio = settings.profileBio || "";
  const profileImage = settings.profileImage || "";
  const contactEnabled = settings.contactEnabled === "true";
  const captchaSiteKey = settings.captchaSiteKey || "";
  const customCss = settings.customCss || "";
  const customHead = settings.customHead || "";
  const brandName = settings.brandName || "";
  const brandLogo = settings.brandLogo || "";
  const accentColor = settings.accentColor || "#0FACED";
  const backgroundColor = settings.backgroundColor || "#091533";
  const showVerifiedBadge = settings.verifiedBadge === "true";

  // Apply theme CSS variables from settings
  useEffect(() => {
    if (isPreview) return; // Don't modify document in preview mode
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

  // Track page view
  useEffect(() => {
    if (isPreview) return;
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/trpc/analytics.trackPageView`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        referrer: document.referrer,
      }),
    }).catch(() => {});
  }, [isPreview]);

  const activeLinks = links.filter((l) => l.isActive);

  return (
    <div
      className="min-h-screen flex flex-col"
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
          {/* Avatar - overlapping the header/body boundary */}
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
              <LinkBlock key={link.id} link={link} />
            ))}
          </div>

          {/* Contact Form */}
          {contactEnabled && !isPreview && (
            <div className="mt-8">
              <ContactForm captchaSiteKey={captchaSiteKey} />
            </div>
          )}

          {/* Footer */}
          <WhitelabelFooter brandName={brandName} brandLogo={brandLogo} />
        </div>
      </div>
    </div>
  );
}

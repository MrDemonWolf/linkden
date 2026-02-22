"use client";

import { useEffect } from "react";
import { Avatar } from "./avatar";
import { LinkBlock } from "./link-block";
import { ContactForm } from "./contact-form";
import { WhitelabelFooter } from "./whitelabel-footer";

interface LinkData {
  id: string;
  type: string;
  title: string;
  url: string;
  icon: string;
  iconType: string;
  isActive: boolean;
  clickCount: number;
  metadata: Record<string, unknown> | null;
}

interface PublicPageProps {
  settings: Record<string, string>;
  links: LinkData[];
}

export function PublicPage({ settings, links }: PublicPageProps) {
  const profileName = settings.profileName || "LinkDen";
  const profileBio = settings.profileBio || "";
  const profileImage = settings.profileImage || "";
  const contactEnabled = settings.contactEnabled === "true";
  const captchaSiteKey = settings.captchaSiteKey || "";
  const customCss = settings.customCss || "";
  const customHead = settings.customHead || "";
  const brandName = settings.brandName || "";
  const brandLogo = settings.brandLogo || "";

  // Apply theme CSS variables from settings
  useEffect(() => {
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

    // Inject custom CSS
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
  }, [settings, customCss]);

  // Inject custom head tags
  useEffect(() => {
    if (customHead) {
      const div = document.createElement("div");
      div.id = "linkden-custom-head";
      div.innerHTML = customHead;
      const children = Array.from(div.children);
      children.forEach((child) => document.head.appendChild(child));
      return () => {
        children.forEach((child) => {
          if (child.parentNode === document.head) {
            document.head.removeChild(child);
          }
        });
      };
    }
  }, [customHead]);

  // Update document title and meta
  useEffect(() => {
    const metaTitle = settings.metaTitle || profileName;
    const metaDescription = settings.metaDescription || profileBio;
    const metaImage = settings.metaImage || profileImage;

    document.title = metaTitle;

    function setMeta(name: string, content: string) {
      if (!content) return;
      let meta = document.querySelector(
        `meta[name="${name}"], meta[property="${name}"]`
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
  }, [settings, profileName, profileBio, profileImage]);

  // Track page view
  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/trpc/analytics.trackPageView`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        referrer: document.referrer,
      }),
    }).catch(() => {
      // silently ignore tracking errors
    });
  }, []);

  return (
    <div className="min-h-screen flex flex-col items-center px-4 py-12">
      <div className="w-full max-w-md space-y-4 animate-fade-in">
        {/* Profile Section */}
        <div className="text-center mb-6">
          <div className="flex justify-center mb-4">
            <Avatar src={profileImage} alt={profileName} size={96} />
          </div>
          <h1 className="text-xl font-bold">{profileName}</h1>
          {profileBio && (
            <p className="text-sm text-[var(--text-secondary)] mt-1 max-w-xs mx-auto">
              {profileBio}
            </p>
          )}
        </div>

        {/* Link Blocks */}
        <div className="space-y-3">
          {links.map((link) => (
            <LinkBlock key={link.id} link={link} />
          ))}
        </div>

        {/* Contact Form */}
        {contactEnabled && (
          <div className="mt-8">
            <ContactForm captchaSiteKey={captchaSiteKey} />
          </div>
        )}

        {/* Footer */}
        <WhitelabelFooter brandName={brandName} brandLogo={brandLogo} />
      </div>
    </div>
  );
}

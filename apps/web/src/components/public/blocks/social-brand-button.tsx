"use client";

import { getSocialBrand } from "@linkden/ui/social-brands";

interface SocialBrandButtonProps {
  platform: string;
  url: string;
  title: string;
  onTrack?: () => void;
}

export function SocialBrandButton({
  platform,
  url,
  title,
  onTrack,
}: SocialBrandButtonProps) {
  const brand = getSocialBrand(platform.toLowerCase());
  const bgColor = brand?.color ?? "var(--primary, #6366f1)";

  function handleClick() {
    onTrack?.();
  }

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      onClick={handleClick}
      style={{
        display: "flex",
        alignItems: "center",
        gap: "0.75rem",
        padding: "0.875rem 1rem",
        borderRadius: "var(--border-radius, 1rem)",
        backgroundColor: bgColor,
        color: "#fff",
        textDecoration: "none",
        fontWeight: 500,
        fontSize: "0.875rem",
        transition: "opacity 0.2s, transform 0.2s",
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.opacity = "0.9";
        (e.currentTarget as HTMLElement).style.transform = "translateY(-1px)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.opacity = "1";
        (e.currentTarget as HTMLElement).style.transform = "translateY(0)";
      }}
    >
      {brand?.icon && (
        <svg
          viewBox="0 0 24 24"
          fill="currentColor"
          width="20"
          height="20"
          aria-hidden="true"
          style={{ flexShrink: 0 }}
        >
          <path d={brand.icon} />
        </svg>
      )}
      <span style={{ flex: 1, textAlign: "center" }}>{title}</span>
    </a>
  );
}

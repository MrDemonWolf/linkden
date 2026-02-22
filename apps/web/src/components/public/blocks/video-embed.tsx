"use client";

import { useMemo } from "react";

interface VideoEmbedProps {
  url: string;
  title?: string;
}

type Provider = "youtube" | "vimeo" | "tiktok";

function detectProvider(url: string): { provider: Provider; embedId: string } | null {
  // YouTube: youtube.com/watch?v=ID, youtu.be/ID, youtube.com/embed/ID
  const ytMatch =
    url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/) ??
    null;
  if (ytMatch) {
    return { provider: "youtube", embedId: ytMatch[1] };
  }

  // Vimeo: vimeo.com/ID, player.vimeo.com/video/ID
  const vimeoMatch =
    url.match(/(?:vimeo\.com\/|player\.vimeo\.com\/video\/)(\d+)/) ?? null;
  if (vimeoMatch) {
    return { provider: "vimeo", embedId: vimeoMatch[1] };
  }

  // TikTok: tiktok.com/@user/video/ID
  const tiktokMatch =
    url.match(/tiktok\.com\/@[^/]+\/video\/(\d+)/) ?? null;
  if (tiktokMatch) {
    return { provider: "tiktok", embedId: tiktokMatch[1] };
  }

  return null;
}

function getEmbedUrl(provider: Provider, embedId: string): string {
  switch (provider) {
    case "youtube":
      return `https://www.youtube-nocookie.com/embed/${embedId}`;
    case "vimeo":
      return `https://player.vimeo.com/video/${embedId}`;
    case "tiktok":
      return `https://www.tiktok.com/embed/v2/${embedId}`;
  }
}

export function VideoEmbed({ url, title }: VideoEmbedProps) {
  const result = useMemo(() => detectProvider(url), [url]);

  if (!result) {
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "1rem",
          borderRadius: "var(--border-radius, 1rem)",
          backgroundColor: "var(--surface, rgba(255,255,255,0.08))",
          border: "1px solid var(--surface-border, rgba(255,255,255,0.12))",
          color: "var(--text-primary, #fff)",
          textDecoration: "none",
          fontSize: "0.875rem",
          fontWeight: 500,
        }}
      >
        {title || "Watch Video"}
      </a>
    );
  }

  const embedUrl = getEmbedUrl(result.provider, result.embedId);

  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        paddingBottom: "56.25%", // 16:9 aspect ratio
        borderRadius: "var(--border-radius, 1rem)",
        overflow: "hidden",
        backgroundColor: "var(--surface, rgba(255,255,255,0.08))",
        border: "1px solid var(--surface-border, rgba(255,255,255,0.12))",
      }}
    >
      <iframe
        src={embedUrl}
        title={title || "Embedded video"}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          border: "none",
        }}
      />
    </div>
  );
}

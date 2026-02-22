"use client";

interface ImageBlockProps {
  url: string;
  alt?: string;
  caption?: string;
}

export function ImageBlock({ url, alt, caption }: ImageBlockProps) {
  return (
    <figure
      style={{
        margin: 0,
        borderRadius: "var(--border-radius, 1rem)",
        overflow: "hidden",
        backgroundColor: "var(--surface, rgba(255,255,255,0.08))",
        border: "1px solid var(--surface-border, rgba(255,255,255,0.12))",
      }}
    >
      <img
        src={url}
        alt={alt || ""}
        style={{
          width: "100%",
          height: "auto",
          display: "block",
          borderRadius: "var(--border-radius, 1rem)",
        }}
      />
      {caption && (
        <figcaption
          style={{
            padding: "0.75rem 1rem",
            fontSize: "0.8125rem",
            color: "var(--text-secondary, rgba(255,255,255,0.6))",
            textAlign: "center",
          }}
        >
          {caption}
        </figcaption>
      )}
    </figure>
  );
}

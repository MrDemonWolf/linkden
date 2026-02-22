"use client";

interface DividerBlockProps {
  style?: "solid" | "dashed" | "dotted" | "gradient";
  color?: string;
}

export function DividerBlock({
  style = "solid",
  color,
}: DividerBlockProps) {
  const baseColor = color ?? "var(--surface-border, rgba(255,255,255,0.12))";

  if (style === "gradient") {
    return (
      <div
        style={{
          height: "1px",
          margin: "0.5rem 0",
          background: `linear-gradient(to right, transparent, ${baseColor}, transparent)`,
        }}
        role="separator"
      />
    );
  }

  return (
    <hr
      style={{
        border: "none",
        borderTop: `1px ${style} ${baseColor}`,
        margin: "0.5rem 0",
      }}
    />
  );
}

"use client";

interface AvatarProps {
  src: string;
  alt: string;
  size?: number;
}

export function Avatar({ src, alt, size = 96 }: AvatarProps) {
  if (!src) {
    return (
      <div
        className="rounded-full bg-[var(--surface)] border-2 border-[var(--surface-border)] flex items-center justify-center"
        style={{ width: size, height: size }}
      >
        <span className="text-[var(--text-secondary)] font-bold" style={{ fontSize: size * 0.35 }}>
          {alt
            .split(" ")
            .map((w) => w[0])
            .join("")
            .toUpperCase()
            .slice(0, 2)}
        </span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      width={size}
      height={size}
      className="rounded-full object-cover border-2 border-[var(--surface-border)]"
      style={{ width: size, height: size }}
    />
  );
}

"use client";

interface AvatarProps {
  src: string;
  alt: string;
  size?: number;
}

export function Avatar({ src, alt, size = 96 }: AvatarProps) {
  const initials = alt
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="relative inline-block">
      {src ? (
        <img
          src={src}
          alt={alt}
          width={size}
          height={size}
          className="rounded-full object-cover border-3 border-white/20 shadow-lg"
          style={{ width: size, height: size }}
        />
      ) : (
        <div
          className="rounded-full bg-gradient-to-br from-white/15 to-white/5 border-3 border-white/20 flex items-center justify-center shadow-lg"
          style={{ width: size, height: size }}
        >
          <span className="text-white/70 font-bold" style={{ fontSize: size * 0.32 }}>
            {initials}
          </span>
        </div>
      )}
    </div>
  );
}

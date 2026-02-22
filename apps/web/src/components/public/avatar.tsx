"use client";

import { BadgeCheck } from "lucide-react";

interface AvatarProps {
  src: string;
  alt: string;
  size?: number;
  verified?: boolean;
}

export function Avatar({ src, alt, size = 96, verified = false }: AvatarProps) {
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
      {verified && (
        <div
          className="absolute -bottom-0.5 -right-0.5 bg-blue-500 rounded-full p-0.5 shadow-md"
          title="Verified"
        >
          <BadgeCheck className="w-5 h-5 text-white" />
        </div>
      )}
    </div>
  );
}

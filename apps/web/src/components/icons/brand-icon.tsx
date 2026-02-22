import { brandIcons, type BrandIcon } from "./brand-icons";

interface BrandIconProps {
  name: string;
  size?: number;
  className?: string;
}

const iconMap = new Map<string, BrandIcon>(
  brandIcons.map((icon) => [icon.slug, icon])
);

const fallbackIcon = iconMap.get("link")!;

export function BrandIcon({ name, size = 24, className }: BrandIconProps) {
  const icon = iconMap.get(name) ?? fallbackIcon;

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox={icon.viewBox}
      width={size}
      height={size}
      fill="currentColor"
      className={className}
      role="img"
      aria-label={icon.name}
    >
      <path d={icon.path} />
    </svg>
  );
}

export function getAllIcons(): BrandIcon[] {
  return brandIcons;
}

export function searchIcons(query: string): BrandIcon[] {
  const lower = query.toLowerCase().trim();
  if (!lower) return brandIcons;

  return brandIcons.filter(
    (icon) =>
      icon.name.toLowerCase().includes(lower) ||
      icon.slug.toLowerCase().includes(lower)
  );
}

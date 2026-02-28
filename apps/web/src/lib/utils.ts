import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getAdminThemeColors(resolvedTheme: string | undefined) {
  const bg = resolvedTheme === "dark" ? "#09090b" : "#ffffff";
  const fg = resolvedTheme === "dark" ? "#fafafa" : "#09090b";
  return { bg, fg };
}

export interface ThemeVariant {
  background: string;
  surface: string;
  surfaceBorder: string;
  primary: string;
  secondary: string;
  textPrimary: string;
  textSecondary: string;
  buttonBg: string;
  buttonText: string;
  buttonHoverBg: string;
}

export interface ThemeConfig {
  id: string;
  name: string;
  category: "business" | "creative";
  dark: ThemeVariant;
  light: ThemeVariant;
  effects: {
    glassmorphism: boolean;
    glowOnHover: boolean;
    gradientButtons: boolean;
    backdropBlur: boolean;
  };
  borderRadius: string;
  fontFamily: string;
}

export const themes: ThemeConfig[] = [
  // ──────────────────────────────────────────────
  // 1. Midnight Glass (DEFAULT) — Liquid Glass + Navy combined
  //    Frosted glass panels over deep navy, cyan accents
  // ──────────────────────────────────────────────
  {
    id: "midnight-glass",
    name: "Midnight Glass",
    category: "business",
    dark: {
      background: "#091533",
      surface: "rgba(255, 255, 255, 0.08)",
      surfaceBorder: "rgba(255, 255, 255, 0.12)",
      primary: "#0FACED",
      secondary: "#7C3AED",
      textPrimary: "rgba(255, 255, 255, 0.95)",
      textSecondary: "rgba(255, 255, 255, 0.55)",
      buttonBg: "rgba(15, 172, 237, 0.20)",
      buttonText: "#0FACED",
      buttonHoverBg: "rgba(15, 172, 237, 0.35)",
    },
    light: {
      background: "#f0f7ff",
      surface: "rgba(255, 255, 255, 0.60)",
      surfaceBorder: "rgba(255, 255, 255, 0.70)",
      primary: "#091533",
      secondary: "#0FACED",
      textPrimary: "rgba(9, 21, 51, 0.90)",
      textSecondary: "rgba(9, 21, 51, 0.55)",
      buttonBg: "rgba(9, 21, 51, 0.10)",
      buttonText: "#091533",
      buttonHoverBg: "rgba(9, 21, 51, 0.20)",
    },
    effects: {
      glassmorphism: true,
      glowOnHover: true,
      gradientButtons: false,
      backdropBlur: true,
    },
    borderRadius: "16px",
    fontFamily:
      '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", Roboto, sans-serif',
  },

  // ──────────────────────────────────────────────
  // 2. Executive — corporate black/white/gold
  // ──────────────────────────────────────────────
  {
    id: "executive",
    name: "Executive",
    category: "business",
    dark: {
      background: "#0c0c0c",
      surface: "#1a1a1a",
      surfaceBorder: "#2a2a2a",
      primary: "#c9a84c",
      secondary: "#e8d48b",
      textPrimary: "#f5f5f5",
      textSecondary: "#999999",
      buttonBg: "#c9a84c",
      buttonText: "#0c0c0c",
      buttonHoverBg: "#dabb5e",
    },
    light: {
      background: "#fafaf8",
      surface: "#ffffff",
      surfaceBorder: "#e8e5dd",
      primary: "#8b6f2e",
      secondary: "#6b5a2e",
      textPrimary: "#1a1a1a",
      textSecondary: "#6b6b6b",
      buttonBg: "#1a1a1a",
      buttonText: "#ffffff",
      buttonHoverBg: "#333333",
    },
    effects: {
      glassmorphism: false,
      glowOnHover: false,
      gradientButtons: false,
      backdropBlur: false,
    },
    borderRadius: "4px",
    fontFamily: '"Playfair Display", Georgia, "Times New Roman", Times, serif',
  },

  // ──────────────────────────────────────────────
  // 3. Slate — professional gray-scale with blue undertones
  // ──────────────────────────────────────────────
  {
    id: "slate",
    name: "Slate",
    category: "business",
    dark: {
      background: "#0f1117",
      surface: "#1a1d27",
      surfaceBorder: "#2a2d3a",
      primary: "#64748b",
      secondary: "#94a3b8",
      textPrimary: "#e2e8f0",
      textSecondary: "#94a3b8",
      buttonBg: "#334155",
      buttonText: "#e2e8f0",
      buttonHoverBg: "#475569",
    },
    light: {
      background: "#f1f5f9",
      surface: "#ffffff",
      surfaceBorder: "#cbd5e1",
      primary: "#475569",
      secondary: "#64748b",
      textPrimary: "#0f172a",
      textSecondary: "#64748b",
      buttonBg: "#475569",
      buttonText: "#ffffff",
      buttonHoverBg: "#334155",
    },
    effects: {
      glassmorphism: false,
      glowOnHover: false,
      gradientButtons: false,
      backdropBlur: false,
    },
    borderRadius: "8px",
    fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  },

  // ──────────────────────────────────────────────
  // 4. Warm Stone — warm neutrals (taupe, sand, terracotta)
  // ──────────────────────────────────────────────
  {
    id: "warm-stone",
    name: "Warm Stone",
    category: "business",
    dark: {
      background: "#1c1816",
      surface: "#2a2420",
      surfaceBorder: "#3d342e",
      primary: "#c4956a",
      secondary: "#d4a574",
      textPrimary: "#f5ebe0",
      textSecondary: "#a89888",
      buttonBg: "#c4956a",
      buttonText: "#1c1816",
      buttonHoverBg: "#d4a574",
    },
    light: {
      background: "#faf6f1",
      surface: "#ffffff",
      surfaceBorder: "#e6ddd3",
      primary: "#9c6b3e",
      secondary: "#c4956a",
      textPrimary: "#3d2e22",
      textSecondary: "#8b7565",
      buttonBg: "#9c6b3e",
      buttonText: "#ffffff",
      buttonHoverBg: "#8b5e35",
    },
    effects: {
      glassmorphism: false,
      glowOnHover: false,
      gradientButtons: false,
      backdropBlur: false,
    },
    borderRadius: "12px",
    fontFamily: '"DM Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  },

  // ──────────────────────────────────────────────
  // 5. Terminal — monospace, green-on-black hacker aesthetic
  // ──────────────────────────────────────────────
  {
    id: "terminal",
    name: "Terminal",
    category: "creative",
    dark: {
      background: "#0a0a0a",
      surface: "#111111",
      surfaceBorder: "#1a1a1a",
      primary: "#00ff41",
      secondary: "#00cc33",
      textPrimary: "#00ff41",
      textSecondary: "#00993d",
      buttonBg: "#00ff41",
      buttonText: "#0a0a0a",
      buttonHoverBg: "#33ff66",
    },
    light: {
      background: "#f0f5f0",
      surface: "#ffffff",
      surfaceBorder: "#c8d8c8",
      primary: "#0a7a2a",
      secondary: "#0d5e22",
      textPrimary: "#0a2a0a",
      textSecondary: "#3d6b3d",
      buttonBg: "#0a7a2a",
      buttonText: "#ffffff",
      buttonHoverBg: "#0d5e22",
    },
    effects: {
      glassmorphism: false,
      glowOnHover: true,
      gradientButtons: false,
      backdropBlur: false,
    },
    borderRadius: "2px",
    fontFamily: '"Fira Code", "JetBrains Mono", "Cascadia Code", "Source Code Pro", monospace',
  },

  // ──────────────────────────────────────────────
  // 6. Neon Circuit — cyberpunk neon pink/purple
  // ──────────────────────────────────────────────
  {
    id: "neon-circuit",
    name: "Neon Circuit",
    category: "creative",
    dark: {
      background: "#0d0015",
      surface: "#150025",
      surfaceBorder: "#2a0045",
      primary: "#ff2d95",
      secondary: "#b026ff",
      textPrimary: "#f0e6ff",
      textSecondary: "#9966cc",
      buttonBg: "linear-gradient(135deg, #ff2d95, #b026ff)",
      buttonText: "#ffffff",
      buttonHoverBg: "linear-gradient(135deg, #ff4da6, #c04dff)",
    },
    light: {
      background: "#faf0ff",
      surface: "#ffffff",
      surfaceBorder: "#e6c6f5",
      primary: "#c2185b",
      secondary: "#7b1fa2",
      textPrimary: "#1a0030",
      textSecondary: "#7b5ea7",
      buttonBg: "linear-gradient(135deg, #c2185b, #7b1fa2)",
      buttonText: "#ffffff",
      buttonHoverBg: "linear-gradient(135deg, #d81b60, #8e24aa)",
    },
    effects: {
      glassmorphism: false,
      glowOnHover: true,
      gradientButtons: true,
      backdropBlur: false,
    },
    borderRadius: "6px",
    fontFamily: '"Rajdhani", "Orbitron", -apple-system, BlinkMacSystemFont, sans-serif',
  },

  // ──────────────────────────────────────────────
  // 7. Monochrome — pure black and white
  // ──────────────────────────────────────────────
  {
    id: "monochrome",
    name: "Monochrome",
    category: "business",
    dark: {
      background: "#000000",
      surface: "#111111",
      surfaceBorder: "#222222",
      primary: "#ffffff",
      secondary: "#cccccc",
      textPrimary: "#ffffff",
      textSecondary: "#888888",
      buttonBg: "#ffffff",
      buttonText: "#000000",
      buttonHoverBg: "#dddddd",
    },
    light: {
      background: "#ffffff",
      surface: "#f5f5f5",
      surfaceBorder: "#e0e0e0",
      primary: "#000000",
      secondary: "#333333",
      textPrimary: "#000000",
      textSecondary: "#666666",
      buttonBg: "#000000",
      buttonText: "#ffffff",
      buttonHoverBg: "#222222",
    },
    effects: {
      glassmorphism: false,
      glowOnHover: false,
      gradientButtons: false,
      backdropBlur: false,
    },
    borderRadius: "0px",
    fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif',
  },
];

export const defaultThemeId = "midnight-glass";

export function getTheme(id: string): ThemeConfig | undefined {
  return themes.find((theme) => theme.id === id);
}

export function getThemeVariant(themeId: string, mode: "dark" | "light"): ThemeVariant | undefined {
  const theme = getTheme(themeId);
  if (!theme) return undefined;
  return theme[mode];
}

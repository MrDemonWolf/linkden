#!/usr/bin/env node
/**
 * Social Brands Generator
 *
 * Pulls brand data from the `simple-icons` npm package and generates
 * `packages/ui/src/social-brands.ts` with curated social/creative platforms.
 *
 * Usage:
 *   node scripts/generate-social-brands.mjs
 *
 * The script:
 *   1. Imports every icon from `simple-icons/icons`
 *   2. Filters to the curated BRAND_LIST below
 *   3. Writes a fully typed TypeScript file with SVG path data, brand color, etc.
 *
 * To add a new brand, add its Simple Icons slug to the appropriate category
 * in BRAND_LIST. Find slugs at https://github.com/simple-icons/simple-icons
 */

import { writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUTPUT_PATH = resolve(__dirname, "../packages/ui/src/social-brands.ts");

// ── Curated brand list ──────────────────────────────────────────────
// Keys = Simple Icons slug (lowercase, no spaces/special chars)
// Values = { category, urlTemplate, displayName? }
//
// Find slugs: https://github.com/simple-icons/simple-icons/blob/develop/slugs.md

const BRAND_LIST = {
  // Social
  youtube: { category: "Social", urlTemplate: "https://youtube.com/@{handle}" },
  x: { category: "Social", urlTemplate: "https://x.com/{handle}", displayName: "X (Twitter)", id: "twitter" },
  instagram: { category: "Social", urlTemplate: "https://instagram.com/{handle}" },
  facebook: { category: "Social", urlTemplate: "https://facebook.com/{handle}" },
  linkedin: { category: "Social", urlTemplate: "https://linkedin.com/in/{handle}" },
  github: { category: "Social", urlTemplate: "https://github.com/{handle}" },
  tiktok: { category: "Social", urlTemplate: "https://tiktok.com/@{handle}" },
  snapchat: { category: "Social", urlTemplate: "https://snapchat.com/add/{handle}" },
  pinterest: { category: "Social", urlTemplate: "https://pinterest.com/{handle}" },
  reddit: { category: "Social", urlTemplate: "https://reddit.com/user/{handle}" },
  mastodon: { category: "Social", urlTemplate: "https://{instance}/@{handle}" },
  threads: { category: "Social", urlTemplate: "https://threads.net/@{handle}" },
  bluesky: { category: "Social", urlTemplate: "https://bsky.app/profile/{handle}" },

  // Messaging
  discord: { category: "Messaging", urlTemplate: "https://discord.gg/{handle}" },
  telegram: { category: "Messaging", urlTemplate: "https://t.me/{handle}" },
  whatsapp: { category: "Messaging", urlTemplate: "https://wa.me/{handle}" },
  signal: { category: "Messaging", urlTemplate: "https://signal.me/#p/{handle}" },

  // Music
  spotify: { category: "Music", urlTemplate: "https://open.spotify.com/artist/{handle}" },
  applemusic: { category: "Music", urlTemplate: "https://music.apple.com/artist/{handle}", id: "apple-music" },
  soundcloud: { category: "Music", urlTemplate: "https://soundcloud.com/{handle}" },
  bandcamp: { category: "Music", urlTemplate: "https://{handle}.bandcamp.com" },

  // Video / Streaming
  twitch: { category: "Streaming", urlTemplate: "https://twitch.tv/{handle}" },
  kick: { category: "Streaming", urlTemplate: "https://kick.com/{handle}" },

  // Creative / Support
  dribbble: { category: "Creative", urlTemplate: "https://dribbble.com/{handle}" },
  behance: { category: "Creative", urlTemplate: "https://behance.net/{handle}" },
  figma: { category: "Creative", urlTemplate: "https://figma.com/@{handle}" },
  patreon: { category: "Creative", urlTemplate: "https://patreon.com/{handle}" },
  kofi: { category: "Creative", urlTemplate: "https://ko-fi.com/{handle}", displayName: "Ko-fi" },
  buymeacoffee: { category: "Creative", urlTemplate: "https://buymeacoffee.com/{handle}", displayName: "Buy Me a Coffee" },

  // Shopping
  etsy: { category: "Shopping", urlTemplate: "https://etsy.com/shop/{handle}" },
  amazon: { category: "Shopping", urlTemplate: "https://amazon.com/shops/{handle}" },

  // Blogging
  medium: { category: "Blogging", urlTemplate: "https://medium.com/@{handle}" },
  substack: { category: "Blogging", urlTemplate: "https://{handle}.substack.com" },
  wordpress: { category: "Blogging", urlTemplate: "https://{handle}.wordpress.com" },
  hashnode: { category: "Blogging", urlTemplate: "https://hashnode.com/@{handle}" },

  // Development
  gitlab: { category: "Development", urlTemplate: "https://gitlab.com/{handle}" },
  devdotto: { category: "Development", urlTemplate: "https://dev.to/{handle}", displayName: "DEV Community", id: "devto" },
  stackoverflow: { category: "Development", urlTemplate: "https://stackoverflow.com/users/{handle}", displayName: "Stack Overflow" },
  codepen: { category: "Development", urlTemplate: "https://codepen.io/{handle}", displayName: "CodePen" },

  // Misc / Newer platforms
  letterboxd: { category: "Social", urlTemplate: "https://letterboxd.com/{handle}" },
  goodreads: { category: "Social", urlTemplate: "https://goodreads.com/user/show/{handle}" },
  tumblr: { category: "Social", urlTemplate: "https://{handle}.tumblr.com" },
  linktree: { category: "Social", urlTemplate: "https://linktr.ee/{handle}", displayName: "Linktree" },
  cashapp: { category: "Creative", urlTemplate: "https://cash.app/${handle}", displayName: "Cash App", id: "cashapp" },
  venmo: { category: "Creative", urlTemplate: "https://venmo.com/{handle}" },
  paypal: { category: "Creative", urlTemplate: "https://paypal.me/{handle}", displayName: "PayPal" },
};

// ── Manual overrides for brands removed from or missing in Simple Icons ─────
// These use hand-curated SVG paths from their respective brand guidelines.
const MANUAL_BRANDS = {
  linkedin: {
    title: "LinkedIn",
    hex: "0A66C2",
    path: "M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z",
  },
  amazon: {
    title: "Amazon",
    hex: "FF9900",
    path: "M.045 18.02c.072-.116.187-.124.348-.022 3.636 2.11 7.594 3.166 11.87 3.166 2.852 0 5.668-.533 8.447-1.595l.315-.14c.238-.1.395-.04.47.18.077.22.003.39-.22.51-.672.36-1.738.853-3.194 1.47-1.455.62-3.166 1.066-5.13 1.338a18.614 18.614 0 01-5.328.077c-2.04-.254-3.87-.793-5.487-1.618-.585-.297-1.136-.637-1.655-1.022-.094-.07-.133-.152-.118-.245l.682-.1zm6.09-7.038c0-1.14.254-2.072.762-2.793.508-.72 1.24-1.266 2.197-1.636a8.39 8.39 0 012.296-.548c.362-.03.847-.05 1.456-.065l.67-.015V4.96c0-.67-.06-1.14-.18-1.413-.202-.455-.6-.683-1.192-.683-.525 0-.907.15-1.146.45-.24.3-.385.75-.435 1.35l-3.07-.22c.13-1.575.665-2.697 1.607-3.37C10.04.4 11.327.063 12.96.063c1.855 0 3.18.507 3.972 1.523.482.6.723 1.41.723 2.433v6.473c0 .484.038.904.113 1.26.075.354.18.63.314.826l.383.553h-3.22c-.12-.176-.227-.418-.323-.726a5.036 5.036 0 01-.152-.618c-.55.56-1.133.97-1.75 1.234a4.91 4.91 0 01-1.988.395c-1.14 0-2.063-.37-2.77-1.108-.707-.74-1.06-1.716-1.06-2.932zm3.237-.14c0 .672.16 1.2.478 1.586.318.387.738.58 1.26.58.498 0 .978-.17 1.44-.51.462-.34.73-.843.806-1.508V9.04c-.588.012-1.077.06-1.466.143-1.012.225-1.695.713-2.048 1.466a3.23 3.23 0 00-.24.752 3.592 3.592 0 00-.06.643l-.17-.198z",
  },
  codepen: {
    title: "CodePen",
    hex: "000000",
    path: "M24 8.182l-.018-.087-.017-.05-.01-.024-.018-.034-.01-.018a.086.086 0 00-.01-.018l-.016-.027-.012-.018-.019-.025-.012-.015-.019-.022-.013-.015-.022-.023-.014-.014-.023-.02-.015-.013-.028-.022-.012-.01-.029-.018-.014-.008-.035-.02-.014-.006-.037-.016-.014-.004-.043-.012H.157l-.043.012-.014.004-.037.016-.014.006-.035.02-.014.008-.029.018-.012.01-.028.022-.015.013-.023.02-.014.014-.022.023-.013.015-.019.022-.012.015-.019.025-.012.018-.016.027a.086.086 0 00-.01.018l-.01.018-.018.034-.01.024-.017.05-.018.087L0 8.5v7l.003.318.018.087.017.05.01.024.018.034.01.018a.086.086 0 00.01.018l.016.027.012.018.019.025.012.015.019.022.013.015.022.023.014.014.023.02.015.013.028.022.012.01.029.018.014.008.035.02.014.006.037.016.014.004.043.012h.01l.065.013h.015l.065.005.072-.005.065-.013.01-.001.043-.012.014-.004.037-.016.014-.006.035-.02.014-.008.029-.018.012-.01.028-.022.015-.013.023-.02.014-.014.022-.023.013-.015.019-.022.012-.015.019-.025.012-.018.016-.027a.086.086 0 00.01-.018l.01-.018.018-.034.01-.024.017-.05.018-.087L24 15.5v-7l-.003-.318zM12 16.5l-5.5-4.5 5.5-4.5 5.5 4.5-5.5 4.5zm-6-4.5L1 17.5V6.5L6 12zm12 0l5-5.5v11L18 12z",
  },
};

async function main() {
  // Dynamically import simple-icons
  let simpleIcons;
  try {
    simpleIcons = await import("simple-icons");
  } catch {
    console.error(
      "Error: 'simple-icons' package not found.\n" +
      "Install it first: pnpm add -D simple-icons -w\n" +
      "Or run: npx simple-icons"
    );
    process.exit(1);
  }

  const brands = [];
  const categoryMap = {};
  const missingBrands = [];

  for (const [slug, config] of Object.entries(BRAND_LIST)) {
    // simple-icons exports icons as `si<PascalName>` — we need to find by slug
    const siKey = `si${pascalCase(slug)}`;
    let icon = simpleIcons[siKey];

    // Fall back to manual overrides
    if (!icon && MANUAL_BRANDS[slug]) {
      icon = MANUAL_BRANDS[slug];
    }

    if (!icon) {
      missingBrands.push(slug);
      continue;
    }

    const brandId = config.id || slug.replace(/dot/g, ".");
    const brandName = config.displayName || icon.title;
    const color = icon.hex ? `#${icon.hex}` : (icon.color || "#000000");
    const svgPath = icon.path;

    brands.push({
      id: brandId,
      name: brandName,
      color,
      icon: svgPath,
      urlTemplate: config.urlTemplate,
      category: config.category,
    });

    if (!categoryMap[config.category]) {
      categoryMap[config.category] = [];
    }
    categoryMap[config.category].push(brandId);
  }

  if (missingBrands.length > 0) {
    console.warn(`Warning: ${missingBrands.length} brands not found in simple-icons:`);
    for (const slug of missingBrands) {
      console.warn(`  - ${slug}`);
    }
  }

  // Generate TypeScript source
  const ts = generateTypeScript(brands, categoryMap);
  writeFileSync(OUTPUT_PATH, ts, "utf-8");

  console.log(`Generated ${OUTPUT_PATH}`);
  console.log(`  ${brands.length} brands across ${Object.keys(categoryMap).length} categories`);
}

function pascalCase(str) {
  return str
    .replace(/[-_.]+/g, " ")
    .replace(/(?:^|\s)\S/g, (a) => a.toUpperCase())
    .replace(/\s+/g, "");
}

function escapeString(str) {
  return str.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\n/g, "\\n");
}

function generateTypeScript(brands, categoryMap) {
  const lines = [
    "// Auto-generated by scripts/generate-social-brands.mjs",
    "// Source: simple-icons (https://simpleicons.org)",
    `// Last updated: ${new Date().toISOString().split("T")[0]}`,
    "// Do not edit manually — run `node scripts/generate-social-brands.mjs` to regenerate",
    "",
    "export interface SocialBrand {",
    '  id: string;',
    '  name: string;',
    '  color: string;',
    '  icon: string; // SVG path data (d attribute for a 24x24 viewBox)',
    '  urlTemplate: string; // e.g., "https://twitter.com/{handle}"',
    "}",
    "",
    "export const socialBrands: SocialBrand[] = [",
  ];

  // Group by category for readability
  const categoryOrder = [
    "Social", "Messaging", "Music", "Streaming",
    "Creative", "Shopping", "Blogging", "Development",
  ];

  const brandsByCategory = {};
  for (const brand of brands) {
    if (!brandsByCategory[brand.category]) {
      brandsByCategory[brand.category] = [];
    }
    brandsByCategory[brand.category].push(brand);
  }

  for (const category of categoryOrder) {
    const catBrands = brandsByCategory[category];
    if (!catBrands || catBrands.length === 0) continue;

    lines.push(`  // ── ${category} ${"─".repeat(Math.max(1, 55 - category.length))}`);
    for (const brand of catBrands) {
      lines.push("  {");
      lines.push(`    id: "${escapeString(brand.id)}",`);
      lines.push(`    name: "${escapeString(brand.name)}",`);
      lines.push(`    color: "${brand.color}",`);
      lines.push(`    icon: "${escapeString(brand.icon)}",`);
      lines.push(`    urlTemplate: "${escapeString(brand.urlTemplate)}",`);
      lines.push("  },");
    }
  }

  lines.push("];");
  lines.push("");
  lines.push("/**");
  lines.push(" * Look up a social brand by its unique id.");
  lines.push(" */");
  lines.push("export function getSocialBrand(id: string): SocialBrand | undefined {");
  lines.push('  return socialBrands.find((brand) => brand.id === id);');
  lines.push("}");
  lines.push("");
  lines.push("/**");
  lines.push(" * Social brands organized by category.");
  lines.push(" */");
  lines.push("export const socialBrandCategories: Record<string, string[]> = {");

  for (const category of categoryOrder) {
    const ids = categoryMap[category];
    if (!ids || ids.length === 0) continue;
    lines.push(`  ${category}: ${JSON.stringify(ids)},`);
  }

  lines.push("};");
  lines.push("");

  return lines.join("\n");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

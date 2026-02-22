# LinkDen - Self-Hosted Link-in-Bio Platform

LinkDen is a self-hosted Linktree alternative built on the
Cloudflare stack. Designed as a single-user link-in-bio platform
with a full admin panel, it replaces heavy PHP frameworks with
modern TypeScript tooling for blazing-fast page loads and easy
customization. Fully whitelabel-capable out of the box.

Your links, your brand, your rules.

## Features

- **Single-User Link Page** — Your root URL is your public
  profile. Visitors land directly on your links with no
  registration or multi-user overhead.
- **Full Admin Panel** — Manage links, appearance, analytics,
  vCard, and Apple Wallet passes from a macOS-inspired dashboard
  protected by Clerk authentication.
- **8 Built-in Themes** — Each theme ships with dark and light
  variants (16 total), plus an auto mode that follows system
  preference.
- **Multiple Block Types** — Links, headings, spacers, text
  blocks, email, phone, vCard download, and Apple Wallet pass.
- **100+ Brand Icons** — Predefined SVG icons for GitHub,
  Twitter/X, Instagram, YouTube, Discord, Mastodon, Bluesky,
  and dozens more platforms.
- **Apple Wallet Business Card** — Generate signed `.pkpass`
  files so visitors can save your contact info directly to
  their iPhone wallet.
- **vCard Support** — Comprehensive digital business card with
  downloadable `.vcf` files covering personal, professional,
  and social fields.
- **Analytics Dashboard** — Track page views, clicks,
  referrers, and country data with time-series charts.
- **Full Whitelabel** — Toggle off all LinkDen branding with
  a single setting. Zero attribution required (MIT license).
- **Branding Customization** — Color pickers, background
  images, button styles, Google Fonts, custom CSS, and
  favicon uploads.
- **Export/Import** — Back up all data as JSON or migrate
  from LinkStack with a dedicated import format.
- **Edge Performance** — Static pages served from Cloudflare
  Pages with API on Workers and D1 SQLite for sub-second
  load times.

## Getting Started

1. Clone the repository:

   ```bash
   git clone https://github.com/mrdemonwolf/linkden.git
   cd linkden
   ```

2. Install dependencies:

   ```bash
   pnpm install
   ```

3. Copy the example environment files and fill in your keys:

   ```bash
   cp .env.example .env
   cp apps/web/.env.example apps/web/.env
   cp apps/server/.env.example apps/server/.env
   ```

4. Set up Clerk authentication:
   - Create a free account at [clerk.com](https://clerk.com)
   - Add your `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` and
     `CLERK_SECRET_KEY` to the environment files
   - Restrict sign-ups to your email only via the Clerk
     dashboard allowlist

5. Push database migrations:

   ```bash
   pnpm db:push
   ```

6. Start the development servers:

   ```bash
   pnpm dev
   ```

7. Open `http://localhost:3001` in your browser. The admin
   panel is at `/admin`.

## Usage

### Public Routes

| Route   | Description                                |
|---------|--------------------------------------------|
| `/`     | Public link-in-bio page                    |
| `/qr`   | QR code for the public page URL            |
| `/pass` | Apple Wallet pass download (iOS/Mac)       |

### Admin Panel (`/admin`)

| Page                | Description                              |
|---------------------|------------------------------------------|
| `/admin`            | Dashboard with quick stats and activity  |
| `/admin/links`      | Link manager with drag-and-drop reorder  |
| `/admin/links/new`  | Add a new link or block                  |
| `/admin/links/[id]` | Edit an existing link or block           |
| `/admin/appearance`  | Themes, colors, fonts, and branding      |
| `/admin/vcard`      | vCard editor for digital business card   |
| `/admin/wallet`     | Apple Wallet pass designer               |
| `/admin/analytics`  | Views, clicks, referrers, and charts     |
| `/admin/settings`   | SEO, export/import, and danger zone      |

## Tech Stack

| Layer      | Technology                          |
|------------|-------------------------------------|
| Frontend   | Next.js (static export)             |
| Backend    | Hono on Cloudflare Workers          |
| API        | tRPC                                |
| Database   | Drizzle ORM + Cloudflare D1 (SQLite)|
| Auth       | Clerk                               |
| Styling    | Tailwind CSS + shadcn/ui            |
| Monorepo   | Turborepo + pnpm workspaces         |
| Docs       | Fumadocs                            |
| Deploy     | Alchemy -> Cloudflare Workers/Pages |
| Wallet     | passkit-generator                   |

## Development

### Prerequisites

- Node.js 20+
- pnpm 9+
- Cloudflare account (free tier works for development)
- Clerk account (free tier)
- Apple Developer account ($99/year, only for Wallet passes)

### Setup

1. Install pnpm if you don't have it:

   ```bash
   corepack enable && corepack prepare pnpm@latest --activate
   ```

2. Install all dependencies:

   ```bash
   pnpm install
   ```

3. Configure environment variables in `.env`,
   `apps/web/.env`, and `apps/server/.env`.

4. Generate database migrations:

   ```bash
   pnpm db:generate
   ```

5. Push migrations to your D1 database:

   ```bash
   pnpm db:push
   ```

6. Start the development environment:

   ```bash
   pnpm dev
   ```

### Development Scripts

- `pnpm dev` — Start all apps in development mode
- `pnpm build` — Build all apps and packages
- `pnpm db:generate` — Generate Drizzle migrations
- `pnpm db:push` — Push migrations to D1
- `pnpm db:studio` — Open Drizzle Studio for the database
- `pnpm cf:deploy` — Deploy to Cloudflare via Alchemy
- `pnpm cf:destroy` — Tear down Cloudflare resources
- `pnpm lint` — Run linting across all workspaces
- `pnpm typecheck` — Run TypeScript type checking

### Code Quality

- TypeScript strict mode across all packages
- Biome for linting and formatting
- Turborepo for cached, parallel builds
- tRPC for end-to-end type safety between frontend and API

## Project Structure

```
linkden/
├── apps/
│   ├── web/            # Next.js frontend (Pages + admin)
│   ├── server/         # Hono API on Cloudflare Workers
│   └── docs/           # Fumadocs documentation site
├── packages/
│   ├── db/             # Drizzle schema + migrations
│   ├── ui/             # Shared shadcn/ui components
│   ├── validators/     # Shared Zod schemas
│   └── infra/          # Alchemy deployment config
├── turbo.json          # Turborepo pipeline config
├── pnpm-workspace.yaml # pnpm workspace definition
├── version.json        # Current version for update checks
└── CLAUDE.md           # Project specification
```

## License

![GitHub license](https://img.shields.io/github/license/mrdemonwolf/linkden.svg?style=for-the-badge&logo=github)

This project is licensed under the MIT License. See the
[LICENSE](LICENSE) file for details. Fully whitelabel-friendly
with no attribution required.

## Contact

Have questions or feedback?

- Discord: [Join my server](https://mrdwolf.net/discord)

---

Made with love by [MrDemonWolf, Inc.](https://www.mrdemonwolf.com)

# LinkDen - Self-Hosted Link-in-Bio Platform

LinkDen is an open-source, self-hosted link-in-bio platform built
on the Cloudflare stack. Designed as a single-user platform with
a modern 3-panel admin editor and a polished public profile page,
it replaces heavy PHP frameworks with TypeScript tooling for
blazing-fast edge performance. Fully whitelabel-capable out of
the box.

Your links, your brand, your rules.

## Features

- **3-Panel Admin Editor** — SmartBio-style interface with a
  block picker on the left, live phone preview in the center,
  and design/settings controls on the right.
- **Themed Public Page** — Glassmorphism-styled profile page
  with gradient headers, social icons row, verified badge, and
  animated link blocks. Seven built-in themes with dark and
  light variants.
- **Multiple Block Types** — Links, headings, spacers, text
  blocks, email, phone, vCard download, and Apple Wallet pass
  with drag-and-drop reordering.
- **Apple Wallet Business Card** — Generate signed `.pkpass`
  files so visitors can save your contact info directly to
  their iPhone wallet.
- **vCard Support** — Downloadable `.vcf` digital business
  cards covering personal, professional, and social fields.
- **Analytics Dashboard** — Track page views, link clicks,
  referrers, and geographic data with time-series charts.
- **Custom Pages** — Create additional pages (privacy policy,
  terms, etc.) with Markdown content rendered as styled HTML.
- **Contact Form** — Built-in contact form with CAPTCHA
  support (Cloudflare Turnstile or Google reCAPTCHA).
- **Edge Caching** — Cloudflare Cache API integration for
  sub-50ms public page loads with automatic cache purge on
  admin saves.
- **Dual Auth** — Supports Cloudflare Access or Clerk for
  admin authentication.
- **SEO Ready** — Auto-generated `sitemap.xml`, `robots.txt`,
  OpenGraph tags, Twitter Cards, and configurable meta fields.
- **Full Whitelabel** — Toggle off all LinkDen branding with
  a single setting. Zero attribution required (MIT license).
- **Export / Import** — Back up all settings and links as JSON.

## Getting Started

Full documentation is available at the
[LinkDen Docs](https://linkden-docs.pages.dev) site, including
guides for self-hosting on Cloudflare, Vercel, Railway, Coolify,
and Docker.

1. Clone the repository:

   ```bash
   git clone https://github.com/mrdemonwolf/LinkDen.git
   cd LinkDen
   ```

2. Install dependencies:

   ```bash
   pnpm install
   ```

3. Copy the example environment file and fill in your values:

   ```bash
   cp .env.example .env
   ```

4. Generate and push the database schema:

   ```bash
   pnpm db:generate
   pnpm db:push
   ```

5. Start all apps in development mode:

   ```bash
   pnpm dev
   ```

6. Open `http://localhost:3001` for the public page and
   `http://localhost:3001/admin` for the admin panel.

## Usage

| URL                           | Purpose                        |
| ----------------------------- | ------------------------------ |
| `http://localhost:3001`       | Public link-in-bio page        |
| `http://localhost:3001/admin` | Admin panel (3-panel editor)   |
| `http://localhost:3000`       | API server (tRPC over Hono)    |
| `http://localhost:3002`       | Documentation site             |

### Admin Panel Sections

| Section    | Description                                      |
| ---------- | ------------------------------------------------ |
| Blocks     | Add, reorder, and manage link blocks             |
| Social     | Configure social media icon links                |
| Design     | Choose themes, customize colors and branding     |
| Analytics  | View page views, clicks, and referrer stats      |
| Settings   | Profile info, SEO, contact form, vCard, export   |
| Pages      | Create custom Markdown pages at `/p/{slug}`      |

## Tech Stack

| Layer          | Technology                                    |
| -------------- | --------------------------------------------- |
| Frontend       | Next.js 15, React 19, Tailwind CSS 3          |
| UI Components  | Radix UI, Lucide Icons, Recharts              |
| State / Data   | tRPC 11, TanStack React Query 5               |
| Backend        | Hono, Cloudflare Workers                      |
| Database       | Cloudflare D1 (SQLite), Drizzle ORM           |
| Auth           | Cloudflare Access / Clerk                     |
| Email          | Resend                                        |
| Docs           | Fumadocs (MDX), Next.js 16                    |
| Deployment     | OpenNext (Cloudflare adapter), Alchemy (IaC)  |
| Monorepo       | pnpm Workspaces, Turborepo                    |
| Linting        | Biome                                         |
| Testing        | Playwright (E2E)                              |

## Development

### Prerequisites

- Node.js >= 20
- pnpm 10.x (`corepack enable`)
- Wrangler CLI (for local D1 and Workers dev)

### Setup

1. Enable corepack and install pnpm:

   ```bash
   corepack enable
   ```

2. Install all dependencies:

   ```bash
   pnpm install
   ```

3. Copy and configure environment variables:

   ```bash
   cp .env.example .env
   ```

4. Generate the database schema:

   ```bash
   pnpm db:generate
   ```

5. Push the schema to your local D1 database:

   ```bash
   pnpm db:push
   ```

6. Start the development environment:

   ```bash
   pnpm dev
   ```

### Development Scripts

- `pnpm dev` — Start all apps (web :3001, server :3000,
  docs :3002) via Turborepo.
- `pnpm build` — Production build for all packages.
- `pnpm lint` — Run Biome linter across all packages.
- `pnpm typecheck` — Run TypeScript type checking.
- `pnpm db:generate` — Generate Drizzle ORM migrations.
- `pnpm db:push` — Push schema changes to D1 (requires
  `CLOUDFLARE_ACCOUNT_ID` and `CLOUDFLARE_API_TOKEN`).
- `pnpm db:studio` — Open Drizzle Studio for database
  inspection.
- `pnpm cf:deploy` — Deploy API + web to Cloudflare Workers.
- `pnpm cf:deploy:api` — Deploy only the API worker.
- `pnpm cf:deploy:web` — Deploy only the web frontend.
- `pnpm cf:destroy` — Tear down Cloudflare resources.
- `pnpm test:e2e` — Run Playwright end-to-end tests.

### Code Quality

- **Biome** for linting and formatting (replaces ESLint
  and Prettier).
- **TypeScript** strict mode across all packages.
- **Zod** schemas shared between client and server via
  `@linkden/validators`.
- **tRPC** for end-to-end type safety between frontend
  and API.

## Project Structure

```
LinkDen/
  apps/
    web/            # Next.js 15 frontend (public page + admin)
    server/         # Cloudflare Worker API (Hono + tRPC)
    docs/           # Fumadocs documentation site
  packages/
    db/             # Drizzle ORM schema and D1 client
    ui/             # Shared UI components and theme configs
    validators/     # Zod schemas shared across apps
    email/          # Resend email templates
    infra/          # Alchemy IaC for Cloudflare deployment
  turbo.json        # Turborepo pipeline config
  pnpm-workspace.yaml
  .env.example      # Environment variable template
```

## License

![GitHub license](https://img.shields.io/github/license/mrdemonwolf/LinkDen.svg?style=for-the-badge&logo=github)

This project is licensed under the MIT License. See the
[LICENSE](LICENSE) file for details. Fully whitelabel-friendly
with no attribution required.

## Contact

Have questions or feedback?

- Discord: [Join my server](https://mrdwolf.net/discord)

---

Made with love by [MrDemonWolf, Inc.](https://www.mrdemonwolf.com)

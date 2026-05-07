# LinkDen - Self-Hosted Link-in-Bio Platform

LinkDen is a fully self-hosted, open-source link-in-bio platform
built for the modern web. It gives you a single page to share your
links, socials, and contact info — all under your own domain, on
your own infrastructure, without giving your data to anyone else.

Designed to run on Cloudflare's edge network, LinkDen is fast,
private, and yours to own completely.

## Features

- **Drag-and-drop builder** — Visually arrange 7 block types (links,
  headers, embeds, social icons, forms, vCards, locations) with live preview.
- **7 built-in themes** — Choose from curated presets with full
  color customization and social icon shape control per-theme.
- **Analytics dashboard** — Track page views and link clicks with
  privacy-first data collection.
- **Connections inbox** — Receive visitor contact form messages directly in
  the admin panel with read/unread management and optional CAPTCHA.
- **Apple Wallet pass** — Generate and distribute a digital business
  card as a `.pkpass` file.
- **vCard export** — Let visitors download your contact details as
  a standard `.vcf` file.
- **Location block** — Embed an Apple Maps or Google Maps tile showing
  your physical address.
- **Backup and restore** — Export all settings, blocks, and data to
  JSON and re-import at any time (replace or merge modes).
- **LinkStack import** — Migrate your existing LinkStack profile
  directly into LinkDen with one click.
- **Whitelabel ready** — Fully allowed. Replace all LinkDen branding
  with your own logo, colors, and name. Consent banner included.
- **100+ social networks** — Built-in branded icons and links for
  every major platform.
- **Edge-cached** — Served from Cloudflare's global network for
  near-zero-latency response times.
- **Secure** — Registration lock, XSS protection, CSRF safety,
  Cloudflare rate limiting, and secret masking baked in.

## Getting Started

Full documentation is available in the docs site included in this
repo under `apps/docs`. Run it locally with `bun dev:docs` and open
`http://localhost:3002`.

Quick start:

1. Clone the repository and install dependencies:
   ```bash
   git clone https://github.com/MrDemonWolf/linkden.git
   cd linkden
   bun install
   ```
2. Copy the example environment file and fill in your values:
   ```bash
   cp .env.example .env
   ```
3. Generate migrations and start all services:
   ```bash
   bun db:generate
   bun dev
   ```
4. Open `http://localhost:3001/admin/setup` to create your admin
   account.

## Tech Stack

| Layer        | Technology                                           |
|--------------|------------------------------------------------------|
| Frontend     | Next.js 16, React 19, Tailwind CSS v4, Radix UI      |
| Backend      | Hono, tRPC v11, Cloudflare Workers                   |
| Database     | Drizzle ORM, Cloudflare D1 (SQLite)                  |
| Auth         | Better Auth (email/password, 2FA, magic link)        |
| Storage      | Cloudflare R2                                        |
| Build system | Bun 1.3.10, Turborepo                                |
| Testing      | Vitest, @testing-library/react                       |
| Deployment   | Cloudflare Workers + Pages (primary), Docker (secondary) |

## Development

### Prerequisites

- [Bun](https://bun.sh) v1.3.10 or later
- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/)
  for local Cloudflare Workers emulation
- A Cloudflare account (free tier works for local development)

### Setup

1. Install dependencies:
   ```bash
   bun install
   ```
2. Configure environment variables:
   ```bash
   # apps/server/.env
   BETTER_AUTH_SECRET=your-secret-here        # openssl rand -base64 32
   BETTER_AUTH_URL=http://localhost:3000
   CORS_ORIGIN=http://localhost:3001

   # apps/web/.env
   NEXT_PUBLIC_SERVER_URL=http://localhost:3000
   ```
3. Generate and push the database schema:
   ```bash
   bun db:generate
   bun db:push
   ```
4. Start all apps:
   ```bash
   bun dev
   ```

### Development Scripts

- `bun dev` — Start all apps (web :3001, server :3000, docs :3002)
- `bun dev:web` — Start the Next.js frontend only
- `bun dev:server` — Start the Cloudflare Workers API only
- `bun dev:docs` — Start the documentation site only
- `bun build` — Build all apps and packages
- `bun check-types` — TypeScript type checks across the monorepo
- `bun test` — Run the test suite with Vitest
- `bun test:watch` — Run tests in watch mode
- `bun db:generate` — Generate a Drizzle migration from schema changes
- `bun db:push` — Push the current schema to the local D1 database
- `bun db:reset` — Wipe the local database state (`.wrangler/state`)
- `bun reset:password` — Reset the admin account password via CLI
- `bun reset:factory` — Factory-reset all data and settings
- `bun ship` — Build and deploy to Cloudflare via Alchemy IaC
- `bun destroy` — Tear down all Cloudflare infrastructure

### Code Quality

- **Biome** — Linting and formatting across all packages
- **TypeScript** — Strict mode enabled in every workspace
- **Zod** — Runtime validation on all API inputs and environment
  variables
- **Drizzle ORM** — Type-safe queries with no raw SQL exposure

## Project Structure

```
linkden/
├── apps/
│   ├── web/          # Next.js frontend (public page + admin panel)
│   ├── server/       # Hono API on Cloudflare Workers
│   └── docs/         # Fumadocs documentation site
├── packages/
│   ├── api/          # tRPC router definitions
│   ├── auth/         # Better Auth configuration
│   ├── config/       # Shared TypeScript configuration
│   ├── db/           # Drizzle ORM schema, migrations, D1 client
│   ├── email/        # React Email templates
│   ├── env/          # Shared environment variable validation
│   ├── infra/        # Alchemy IaC for Cloudflare deployment
│   ├── ui/           # UI component library (Radix + CVA + Tailwind)
│   └── validators/   # Shared Zod validation schemas
├── scripts/          # CLI utilities (reset-password, factory-reset)
├── docs/             # Compliance reports (GDPR, ISO 27001)
└── package.json      # Root workspace config (Bun + Turborepo)
```

## License

![GitHub license](https://img.shields.io/github/license/mrdemonwolf/linkden.svg?style=for-the-badge&logo=github)

MIT — fork it, run it, make it your own. Whitelabeling is fully
allowed.

## Contact

Have a question or found a bug?

- [Join my Discord server](https://mrdwolf.net/discord)

---

Made with love by [MrDemonWolf, Inc.](https://www.mrdemonwolf.com)

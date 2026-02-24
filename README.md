# LinkDen - Self-Hosted Link-in-Bio Platform

LinkDen is a self-hosted, single-user link-in-bio application
built for Cloudflare-first deployment with Docker/Coolify as
a secondary target. It gives you full control over your
personal link page with a drag-and-drop builder, real-time
analytics, Apple Wallet integration, and full theming.

Own your links. Own your data.

## Features

- **Drag-and-Drop Builder** -- Visual block editor with live
  phone-frame preview, supporting link buttons, headers,
  social icon rows, embeds, and contact forms.
- **7 Theme Presets** -- Default, Corporate Classic, Corporate
  Modern, Hacker Terminal, Neon Cyber, Furry Pastel, and Furry
  Bold with full light/dark mode support and custom color
  overrides.
- **Analytics Dashboard** -- Privacy-friendly page view and
  link click tracking with time-series charts, top links,
  referrer breakdown, and country stats.
- **Contact Form** -- Built-in contact form with CAPTCHA
  support (Cloudflare Turnstile or Google reCAPTCHA), email
  notifications via Resend, and submission management.
- **Apple Wallet Pass** -- Generate .pkpass business cards
  with your profile, links, and QR code.
- **vCard Support** -- Downloadable .vcf digital business
  cards with personal, professional, and social fields.
- **Export/Import** -- Full data backup and restore as JSON
  with merge or replace modes.
- **Whitelabel** -- Toggle off all LinkDen branding for a
  completely clean public page.
- **Edge Caching** -- Cloudflare Cache API integration for
  near-zero-cost hosting on Workers + D1.
- **50+ Social Networks** -- Curated registry of social
  platforms with brand colors and icons.
- **SEO Optimized** -- Auto-generated sitemap.xml, robots.txt,
  Open Graph tags, and Twitter Cards.
- **Accessible** -- WCAG 2.1 AA compliant with keyboard
  navigation, screen reader support, focus indicators, and
  reduced motion support via Radix UI primitives.
- **PWA Ready** -- Installable admin panel with web app
  manifest.
- **Docker Support** -- Run anywhere with Docker Compose and
  local SQLite persistence.
- **Version Management** -- Automatic update checking against
  GitHub releases with admin banner notifications.

## Getting Started

1. Clone the repository:

   ```bash
   git clone https://github.com/mrdemonwolf/LinkDen.git
   cd LinkDen
   ```

2. Copy the environment file and fill in your values:

   ```bash
   cp .env.example .env
   ```

3. Install dependencies:

   ```bash
   pnpm install
   ```

4. Generate database migrations:

   ```bash
   pnpm db:generate
   ```

5. Start the development server:

   ```bash
   pnpm dev
   ```

6. Open the admin setup wizard at `http://localhost:3001/admin/setup`
   to create your account and configure your page.

### Docker Quickstart

```bash
docker compose up -d
```

The app will be available at `http://localhost:3000`. Set
`BETTER_AUTH_SECRET` in your environment before starting.

## Tech Stack

| Layer          | Technology                                     |
| -------------- | ---------------------------------------------- |
| Frontend       | Next.js 16, React 19, Tailwind CSS v4          |
| UI Components  | Radix UI, CVA, Lucide Icons                    |
| Backend        | Hono, tRPC v11                                 |
| Runtime        | Cloudflare Workers                             |
| Database       | Drizzle ORM, Cloudflare D1 (SQLite)            |
| Auth           | Better Auth (email/password)                   |
| Email          | React Email, Resend API                        |
| Validation     | Zod v4                                         |
| Build          | Turborepo, tsdown                              |
| Deployment     | Alchemy IaC, OpenNext for Cloudflare           |
| Package Manager| pnpm 10                                        |

## Development

### Prerequisites

- Node.js 22 or later
- pnpm 10 (`corepack enable && corepack prepare pnpm@10`)
- A Cloudflare account (for D1 and Workers deployment)

### Setup

1. Install dependencies:

   ```bash
   pnpm install
   ```

2. Copy and configure environment variables:

   ```bash
   cp .env.example .env
   cp .env.example apps/server/.env
   cp .env.example apps/web/.env
   ```

3. Generate database migrations:

   ```bash
   pnpm db:generate
   ```

4. Start all apps in development mode:

   ```bash
   pnpm dev
   ```

   The frontend runs on `http://localhost:3001` and the
   API server on `http://localhost:3000`.

### Development Scripts

- `pnpm dev` -- Start all apps in development mode
- `pnpm build` -- Build all apps and packages
- `pnpm check-types` -- Run TypeScript type checking
- `pnpm dev:web` -- Start only the web frontend
- `pnpm dev:server` -- Start only the API server
- `pnpm db:generate` -- Generate Drizzle migrations
- `pnpm db:push` -- Push schema to database
- `pnpm deploy` -- Deploy to Cloudflare via Alchemy
- `pnpm destroy` -- Tear down Cloudflare resources

### Code Quality

- TypeScript strict mode across all packages
- Biome for linting and formatting
- Zod schemas for runtime validation at all boundaries

## Project Structure

```
LinkDen/
├── apps/
│   ├── web/               # Next.js frontend (public page + admin)
│   └── server/            # Hono API on Cloudflare Workers
├── packages/
│   ├── api/               # tRPC router definitions
│   ├── auth/              # Better Auth configuration
│   ├── config/            # Shared TypeScript configuration
│   ├── db/                # Drizzle ORM schema + migrations
│   ├── email/             # React Email templates
│   ├── env/               # Environment variable validation
│   ├── infra/             # Alchemy IaC for Cloudflare
│   ├── ui/                # Custom UI component library
│   └── validators/        # Shared Zod validation schemas
├── data/
│   └── social-networks.json  # Curated social platform registry
├── scripts/
│   └── check-social-icons.mjs  # Social icon update checker
├── .github/workflows/     # CI, docs deploy, social icon check
├── biome.json             # Linting and formatting config
├── docker-compose.yml     # Docker deployment
├── Dockerfile             # Multi-stage Docker build
├── turbo.json             # Turborepo pipeline config
└── version.json           # App version for update checks
```

## License

![GitHub license](https://img.shields.io/github/license/mrdemonwolf/LinkDen.svg?style=for-the-badge&logo=github)

This project is licensed under the MIT License. See the
[LICENSE](LICENSE) file for details.

## Contact

Have questions or feedback? Reach out:

- Discord: [Join my server](https://mrdwolf.net/discord)
- GitHub Issues: [Open an issue](https://github.com/mrdemonwolf/LinkDen/issues)

---

Made with love by [MrDemonWolf, Inc.](https://www.mrdemonwolf.com)

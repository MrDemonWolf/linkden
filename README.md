# LinkDen - Self-Hosted Link-in-Bio Platform

LinkDen is a fully self-hosted, open-source link-in-bio platform built
for Cloudflare's edge network. It gives you a drag-and-drop block
builder, full theme control, analytics, Apple Wallet pass generation,
and a contact inbox — all running on Cloudflare Workers + D1 with
near-zero cold starts. Designed for privacy-conscious users who want
full ownership of their profile page without giving their data to
anyone else.

Own your presence. Host your own link page.

## Features

- **Drag-and-drop builder** — Visually arrange 9 block types (links,
  headers, embeds, contact forms, vCards, locations, images, text,
  dividers) with a live phone preview.
- **11 built-in themes** — Curated light/dark presets with colour
  overrides, custom CSS and social icon shape control.
- **Analytics dashboard** — Track page views and link clicks with
  consent-first, privacy-first data collection (no IPs or user agents
  stored).
- **Inbox** — Receive visitor contact form messages directly in
  the admin panel, with optional email notifications and CAPTCHA
  (Turnstile, reCAPTCHA or hCaptcha).
- **Apple Wallet pass** — Build a signed digital business card
  (`.pkpass`) and download it from the admin to share.
- **vCard export** — Let visitors download your contact details as
  a standard `.vcf` file.
- **Location block** — Show your address with a one-tap link to
  Apple Maps, Google Maps or a custom map.
- **Backup and restore** — Export all settings, blocks, and data to
  JSON and re-import at any time (replace or merge modes).
- **LinkStack import** — Migrate your existing LinkStack profile
  directly into LinkDen with one click.
- **Whitelabel ready** — Fully allowed. Replace all LinkDen branding
  with your own logo, colors, and name. Consent banner included.
- **50+ social networks** — Built-in branded icons and links for
  the major platforms.
- **Edge-cached** — Served from Cloudflare's global network for
  near-zero-latency response times.
- **Secure** — Two-factor sign-in (authenticator app + backup
  codes), a single-admin lock enforced in the database, optional
  setup token, same-origin write checks, per-call Cloudflare rate
  limiting, XSS protection, and secret masking baked in.

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
2. Copy the example environment file and fill in your values
   (`BETTER_AUTH_SECRET` from `openssl rand -base64 32`):
   ```bash
   cp .env.example .env
   ```
3. Start all apps. `bun dev` runs Alchemy in dev mode, applies the
   database migrations for you, and needs `ALCHEMY_STATE_TOKEN` in
   `.env` (see the Cloudflare self-hosting docs). Without a state
   token, run the API and web app separately instead (see
   [Setup](#setup) below).
   ```bash
   bun dev
   ```
4. Open `http://localhost:3001/admin/setup` to create your admin
   account, then turn on two-factor sign-in under Settings → Account.
   With 2FA on, the login page asks for a code from your
   authenticator app (or one of your backup codes) after the password.

## Usage

Once running, the following local URLs are available:

| Service      | URL                            |
|--------------|--------------------------------|
| Public page  | `http://localhost:3001`        |
| Admin panel  | `http://localhost:3001/admin`  |
| API          | `http://localhost:3000`        |
| Docs site    | `http://localhost:3002`        |

The setup wizard at `/admin/setup` walks through account creation,
profile configuration, and theme selection. After setup, all content
is managed from the admin panel.

## Tech Stack

| Layer        | Technology                                           |
|--------------|------------------------------------------------------|
| Frontend     | Next.js 16, React 19, Tailwind CSS v4, Base UI       |
| Backend      | Hono, tRPC v11, Cloudflare Workers                   |
| Database     | Drizzle ORM, Cloudflare D1 (SQLite)                  |
| Auth         | Better Auth (email/password, TOTP 2FA, magic link)   |
| Storage      | Cloudflare R2                                        |
| Build system | Bun 1.3.10, Turborepo                                |
| Testing      | Vitest, @testing-library/react, Playwright           |
| Deployment   | Cloudflare Workers via Alchemy IaC                   |

## Development

### Prerequisites

- [Bun](https://bun.sh) v1.3.10 or later
- [Node.js](https://nodejs.org) 24 (Alchemy runs under Node)
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
   # apps/server/.dev.vars (read by wrangler dev; apps/server/.env by bun dev)
   BETTER_AUTH_SECRET=your-secret-here        # openssl rand -base64 32
   BETTER_AUTH_URL=http://localhost:3000
   CORS_ORIGIN=http://localhost:3001

   # apps/web/.env
   NEXT_PUBLIC_SERVER_URL=http://localhost:3000
   NEXT_PUBLIC_SITE_URL=http://localhost:3001
   ```
   The API refuses to run auth with an empty `BETTER_AUTH_SECRET`
   (sign-in answers 503 and `/api/health` reports
   `"auth": "misconfigured"`); outside localhost it must also be 32+
   characters.
3. Start the apps. Either everything through Alchemy (applies
   migrations automatically, needs `ALCHEMY_STATE_TOKEN`):
   ```bash
   bun dev
   ```
   or the API and web app on their own (no Alchemy state needed;
   apply the migrations to the local D1 once first):
   ```bash
   cd apps/server && for f in ../../packages/db/src/migrations/*.sql; do bunx wrangler d1 execute linkden-db --local --file="$f" --yes; done; cd ../..
   bun dev:server
   bun dev:web
   ```
   There is no `db:push`: schema changes go through
   `bun db:generate` migrations, which Alchemy applies on `bun dev`
   and `bun ship`.

### Development Scripts

- `bun dev` — Start all apps via Alchemy (web :3001, server :3000, docs :3002; needs `ALCHEMY_STATE_TOKEN`)
- `bun dev:web` — Start the Next.js frontend only
- `bun dev:server` — Start the Cloudflare Workers API only
- `bun dev:docs` — Start the documentation site only
- `bun build` — Build all apps and packages
- `bun check-types` — TypeScript type checks across the monorepo
- `bun run test` — Run the test suite with Vitest (use `bun run test`, not `bun test` — the latter invokes Bun's own runner)
- `bun run test:watch` — Run tests in watch mode
- `bun run test:coverage` — Run tests with coverage and thresholds
- `bun run test:e2e` — Run the Playwright suite (`PW_BASE_URL` / `PW_API_URL` override the origins)
- `bun db:generate` — Generate a Drizzle migration from schema changes (contributors only)
- `bun db:reset` — Wipe both local dev databases (`bun dev` and `bun dev:server` stores)
- `bun reset:password -- --email <email> [--disable-2fa] [--remote] [--db <name>]` — Reset
  the admin password. The password is read from a hidden prompt, stdin or
  `LINKDEN_RESET_PASSWORD` (never argv), hashed with Better Auth's scrypt, and every
  session is signed out. Locally it updates both dev stores; `--remote` targets the
  production D1 (`--db`, else `LINKDEN_DB_NAME`, else `linkden-db`; run from the repo root)
- `bun reset:factory -- --confirm [--remote] [--confirm-db <name>]` — Factory-reset all
  data in one atomic step (schema and migration history kept); `--remote` asks you to
  type the database name
- `bun ship` — Build and deploy to Cloudflare via Alchemy IaC
- `bun run destroy` — Tear down the Cloudflare Workers. The `prod` stage needs
  `LINKDEN_CONFIRM_DESTROY_PROD=yes`, and production D1/R2 are kept once a deploy has
  recorded `delete: false`

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
│   ├── ui/           # UI component library (Base UI + CVA + Tailwind)
│   └── validators/   # Shared Zod validation schemas
├── scripts/          # CLI utilities (reset-password, factory-reset)
├── docs/             # Compliance reports (GDPR, ISO 27001)
└── package.json      # Root workspace config (Bun + Turborepo)
```

## Changelog

See [`CHANGELOG.md`](./CHANGELOG.md) for the full release history. The canonical
version number lives in [`version.json`](./version.json).

## License

![GitHub license](https://img.shields.io/github/license/mrdemonwolf/linkden.svg?style=for-the-badge&logo=github)

MIT — fork it, run it, make it your own. Whitelabeling is fully
allowed.

## Contact

Have a question or found a bug?

- [Join my Discord server](https://mrdwolf.net/discord)

---

Made with love by [MrDemonWolf, Inc.](https://www.mrdemonwolf.com)

# LinkDen

**Self-hosted. Open source. Your links, your way.**

LinkDen is a personal link-in-bio app built for people who want to own their data and analytics. No SaaS tiers, no support contracts—just the code.

Built for **Cloudflare** (Workers + D1 + R2) and **Docker/Coolify**.

---

## Features

- **Drag-and-Drop Builder** — Visual editor with live phone preview.
- **7 Theme Presets** — Corporate, Hacker, Neon, Furry, and more.
- **Analytics Dashboard** — Privacy-friendly tracking for views and clicks.
- **Contact Form** — Built-in messaging with CAPTCHA support.
- **Apple Wallet Pass** — Digital business cards for your iPhone.
- **vCard Support** — Downloadable contact cards.
- **Export/Import** — Full data backup and restore as JSON.
- **Whitelabel** — **Fully Allowed.** Toggle off all LinkDen branding.
- **Edge Caching** — Near-zero-cost hosting on Cloudflare.
- **100+ Social Networks** — Branded colors and icons for every platform.
- **Secure** — XSS protection, CSRF safety, registration locks, and security headers.

---

## Quick Start (Local Development)

```bash
git clone https://github.com/MrDemonWolf/linkden.git
cd linkden
cp .env.example .env
bun install
bun run db:generate
bun dev
```

Open `http://localhost:3001/admin/setup` to create your admin account.

---

## Deploy to Cloudflare

LinkDen runs natively on Cloudflare Workers + D1 + R2.

1. **Prerequisites:** [Cloudflare account](https://dash.cloudflare.com), [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/install-and-update/), [Bun](https://bun.sh)

2. **Configure environment:**
   ```bash
   cp .env.example .env
   # Edit .env — set BETTER_AUTH_SECRET, BETTER_AUTH_URL, CORS_ORIGIN, NEXT_PUBLIC_SERVER_URL
   # Use your production domain URLs
   ```

3. **Deploy:**
   ```bash
   bun run ship
   ```
   This provisions D1, R2, and Workers via Alchemy IaC.

4. **Tear down (if needed):**
   ```bash
   bun run destroy
   ```

---

## Deploy with Docker / Coolify

```bash
cp .env.example .env
# Edit .env — set at minimum BETTER_AUTH_SECRET
docker compose up -d
```

App available at `http://localhost:3000`.

For **Coolify**, point to this repo and set environment variables in the Coolify dashboard. The included `Dockerfile` and `docker-compose.yml` are ready to use.

**Persistent data:** The SQLite database is stored at `/data/linkden.db` inside the container. The `docker-compose.yml` mounts a named volume for persistence.

---

## Environment Variables

See [`.env.example`](.env.example) for the full list. Summary:

| Variable | Required | Description |
|---|---|---|
| `BETTER_AUTH_SECRET` | Yes | Auth encryption key. Generate with `openssl rand -base64 32` |
| `BETTER_AUTH_URL` | Yes | Hono server URL (e.g. `https://api.yourdomain.com`) |
| `CORS_ORIGIN` | Yes | Next.js frontend URL (e.g. `https://yourdomain.com`) |
| `NEXT_PUBLIC_SERVER_URL` | Yes | Same as `BETTER_AUTH_URL` (used by browser) |
| `EMAIL_API_KEY` | No | Resend/SendGrid API key for password reset & magic links |
| `CAPTCHA_SITE_KEY` / `CAPTCHA_SECRET_KEY` | No | Turnstile keys for contact form protection |
| `WALLET_*` | No | Apple Wallet pass signing credentials |

---

## Backup & Restore

LinkDen has built-in backup/restore in the admin panel under **Settings > Backup**.

- **Export:** Downloads all blocks, social networks, contact submissions, and settings as JSON. Secrets (API keys, tokens) are excluded from exports for security.
- **Import:** Supports two modes:
  - **Replace** — Wipes existing data, then inserts from backup.
  - **Merge** — Upserts by primary key, preserving data not in the backup.
- **LinkStack Import:** Migrate from LinkStack with one click.

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | Next.js 16, React 19, Tailwind CSS v4 |
| **Backend** | Hono, tRPC v11, Cloudflare Workers |
| **Database** | Drizzle ORM, Cloudflare D1 (SQLite) |
| **Auth** | Better Auth |
| **Storage** | Cloudflare R2 |
| **Tooling** | Bun, Turborepo, Biome |

---

## Development Scripts

| Command | Description |
|---|---|
| `bun dev` | Start everything (Web + Server) |
| `bun run build` | Build all apps |
| `bun run check-types` | Run TypeScript checks |
| `bun run db:generate` | Generate Drizzle migrations |
| `bun run db:push` | Sync schema to database |
| `bun run ship` | Deploy to Cloudflare |
| `bun run destroy` | Tear down infrastructure |
| `bun run reset:factory` | Wipe DB and start fresh |

---

## Security

- **Single-user:** Registration locks after the first account is created.
- **Input validation:** All inputs validated with Zod schemas.
- **XSS protection:** HTML stripped from user inputs; SVG uploads blocked.
- **CSRF:** SameSite cookie policy with httpOnly and secure flags.
- **Rate limiting:** Cloudflare-native rate limiters on auth, signup, and uploads.
- **Security headers:** HSTS, X-Content-Type-Options, X-Frame-Options, Referrer-Policy.
- **Secret masking:** API keys and tokens are masked in admin UI responses.
- **Backup safety:** Secrets are excluded from data exports.

---

## License

MIT — fork it, run it, make it your own. **Whitelabeling is 100% fully allowed.**

---

Built by [MrDemonWolf](https://www.mrdemonwolf.com).

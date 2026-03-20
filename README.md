# 🔗 LinkDen

**Self-hosted. Open source. Your links, your way.**

LinkDen is a personal link-in-bio app built for people who want to own their data and analytics. No SaaS tiers, no support contracts—just the code.

🚀 **Built for Cloudflare** (Workers + D1 + R2) and **Docker/Coolify**.

---

### ⚡ TL;DR
- 🚀 **Fast:** Runs on the Edge (Cloudflare).
- 🎨 **Beautiful:** 7 themes + custom overrides.
- 📱 **Mobile-First:** Apple Wallet & vCard support.
- 🏷️ **Whitelabel:** 100% Fully Allowed (MIT).
- 🔒 **Private:** You own the database.

---

## ✨ Features

- 🧱 **Drag-and-Drop Builder** -- Visual editor with live phone preview.
- 🎨 **7 Theme Presets** -- Corporate, Hacker, Neon, Furry, and more.
- 📊 **Analytics Dashboard** -- Privacy-friendly tracking for views and clicks.
- 📝 **Contact Form** -- Built-in messaging with CAPTCHA support.
- 🍏 **Apple Wallet Pass** -- Digital business cards for your iPhone.
- 📇 **vCard Support** -- Downloadable contact cards.
- 💾 **Export/Import** -- Full data backup and restore as JSON.
- 🏷️ **Whitelabel** -- **Fully Allowed.** Toggle off all LinkDen branding.
- ⚡ **Edge Caching** -- Near-zero-cost hosting on Cloudflare.
- 🌐 **100+ Social Networks** -- Branded colors and icons for every platform.
- 🛡️ **Secure** -- XSS protection, CSRF safety, and registration locks.

---

## 🚀 Quick Start

1. **Clone the repo:**
   ```bash
   git clone https://github.com/MrDemonWolf/linkden.git
   cd linkden
   ```

2. **Setup environment:**
   ```bash
   cp .env.example .env
   ```

3. **Install & Run:**
   ```bash
   bun install
   bun run db:generate
   bun run dev
   ```

4. **Setup Admin:** Open `http://localhost:3001/admin/setup`.

### 🐳 Docker Quickstart
```bash
docker compose up -d
```
App available at `http://localhost:3000`. Set `BETTER_AUTH_SECRET` first!

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | Next.js 16, React 19, Tailwind CSS v4 |
| **Backend** | Hono, tRPC v11, Cloudflare Workers |
| **Database** | Drizzle ORM, Cloudflare D1 (SQLite) |
| **Auth** | Better Auth |
| **Storage** | Cloudflare R2 |
| **Tooling** | Bun, Turborepo, Biome, Vitest |

---

## 💻 Development Scripts

- `bun dev` -- Start everything (Web + Server)
- `bun run build` -- Build all apps
- `bun run check-types` -- Run TypeScript checks
- `bun run db:push` -- Sync schema to database
- `bun run ship` -- Deploy to Cloudflare
- `bun run destroy` -- Tear down infrastructure
- `bun run reset:factory` -- Wipe DB and start fresh

---

## 📜 License

MIT — fork it, run it, make it your own. **Whitelabeling is 100% fully allowed.**

---

Built by [MrDemonWolf](https://www.mrdemonwolf.com).

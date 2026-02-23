# LinkDen

Self-hosted link-in-bio application built for Cloudflare-first deployment.

## Project Structure

- `apps/web` — Next.js frontend (public page + admin panel)
- `apps/server` — Hono API on Cloudflare Workers with tRPC
- `apps/docs` — Fumadocs documentation site
- `packages/ui` — Custom UI component library (Radix + CVA + Tailwind)
- `packages/api` — tRPC router definitions
- `packages/auth` — Better Auth configuration
- `packages/db` — Drizzle ORM schema + D1/SQLite client
- `packages/env` — Shared environment variable validation
- `packages/config` — Shared TypeScript configuration
- `packages/infra` — Alchemy IaC for Cloudflare deployment
- `packages/validators` — Shared Zod validation schemas
- `packages/email` — Email templates (React Email)

## Commands

- `pnpm dev` — Start all apps in development mode
- `pnpm build` — Build all apps and packages
- `pnpm check-types` — TypeScript type checking
- `pnpm db:generate` — Generate Drizzle migrations
- `pnpm db:push` — Push schema to database
- `pnpm deploy` — Deploy to Cloudflare via Alchemy
- `pnpm destroy` — Tear down Cloudflare resources

## Tech Stack

- **Frontend:** Next.js 16, React 19, Tailwind CSS v4, Radix UI
- **Backend:** Hono, tRPC v11, Cloudflare Workers
- **Database:** Drizzle ORM, Cloudflare D1 (SQLite)
- **Auth:** Better Auth (email/password)
- **Deployment:** Cloudflare Workers + Pages (primary), Docker/Coolify (secondary)

## 📚 CRITICAL DOCUMENTATION PATTERN
**ALWAYS ADD IMPORTANT DOCS HERE!** When you create or discover:
- Architecture diagrams → Add reference path here
- Database schemas → Add reference path here
- Problem solutions → Add reference path here
- Setup guides → Add reference path here

This prevents context loss! Update this file IMMEDIATELY when creating important docs.

# CLAUDE.md — LinkDen Project Intelligence

## Project Overview

LinkDen is a self-hosted link-in-bio platform (like Linktree/LinkStack) built as a monorepo with:
- **apps/web** — Next.js 15 frontend (React 19, TypeScript, Tailwind CSS)
- **apps/server** — tRPC API server (Cloudflare Workers, D1 SQLite)
- **apps/docs** — Documentation site
- **packages/db** — Drizzle ORM schema
- **packages/ui** — Shared UI utilities (themes, social brands)
- **packages/validators** — Zod validation schemas
- **packages/email** — Email templates (Resend)

## Common Commands

- `pnpm dev` — Start all apps in development
- `pnpm build` — Build all packages and apps
- `pnpm lint` — Lint all packages
- `pnpm db:generate` — Generate Drizzle migrations after schema changes
- `pnpm db:migrate` — Run database migrations

## Architecture

- **Auth:** Dual provider — Cloudflare Access (JWT) or Clerk (Bearer token)
- **Database:** SQLite via Cloudflare D1, Drizzle ORM
- **API:** tRPC with public and protected procedures
- **Styling:** Tailwind CSS + CSS custom properties for theming
- **State:** tRPC React Query hooks, local state for admin editor
- **Draft/Publish:** Links and settings have draft columns; edits write to draft, publish merges to live

## Key Patterns

- Admin panel uses a 3-panel editor (left: blocks, center: preview, right: design/settings)
- Sub-pages (analytics, vcard, wallet, contacts, pages) are accessed via drawers, not page navigation
- Block types are defined in `packages/db/src/schema.ts` as `linkTypeEnum`
- Themes defined in `packages/ui/src/themes.ts` with dark/light variants
- CSS variables used throughout: `--admin-*` for admin, `--background`, `--primary`, etc. for public page

## 📚 CRITICAL DOCUMENTATION PATTERN

**ALWAYS ADD IMPORTANT DOCS HERE!** When you create or discover:

### Architecture Diagrams
- (Add reference paths here when created)

### Database Schemas
- `packages/db/src/schema.ts` — All table definitions (links, settings, analytics, vcard, walletPass, contactSubmissions, pages)
- Draft system: `links.draft` (JSON overlay), `links.publishedAt`, `settings.draftValue`

### Problem Solutions
- (Add reference paths here when solved)

### Setup Guides
- `docs/` — Documentation site with setup guides
- `.dev.vars.example` — Cloudflare Workers local dev secrets template

This prevents context loss! Update this file IMMEDIATELY when creating important docs.

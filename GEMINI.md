# GEMINI.md - LinkDen Context & Instructions

This file provides foundational mandates and architectural context for Gemini CLI when working on the LinkDen codebase.

## Project Overview
LinkDen is a **self-hosted, single-user link-in-bio platform** designed for Cloudflare-first deployment (Workers + D1 + R2) with Docker/Coolify as a secondary target. It features a drag-and-drop builder, real-time analytics, Apple Wallet integration, and a themes system.

### Core Architecture (Monorepo)
- **Runtime:** Bun (v1.3+)
- **Build System:** Turborepo
- **Apps:**
  - `apps/web`: Next.js 16 (React 19), Tailwind CSS v4, Radix UI. Handles the admin panel and public pages.
  - `apps/server`: Hono API running on Cloudflare Workers. Serves as the tRPC server.
  - `apps/docs`: Documentation site built with Fumadocs.
- **Packages:**
  - `packages/api`: tRPC router definitions and context.
  - `packages/db`: Drizzle ORM schema and migrations for Cloudflare D1 (SQLite).
  - `packages/ui`: Shared UI component library (Radix + CVA + Tailwind).
  - `packages/auth`: Better Auth configuration.
  - `packages/validators`: Shared Zod schemas for cross-boundary validation.
  - `packages/env`: Environment variable validation (server/web).
  - `packages/infra`: Alchemy IaC for Cloudflare deployment.
  - `packages/email`: React Email templates.

## Tech Stack
- **Frontend:** Next.js 16, React 19, Tailwind CSS v4, Radix UI.
- **Backend:** Hono, tRPC v11, Cloudflare Workers.
- **Database:** Drizzle ORM, Cloudflare D1 (SQLite).
- **Auth:** Better Auth (Email/Password).
- **Storage:** Cloudflare R2 (for avatars, banners, and OG images).
- **Tooling:** Biome (Linting/Formatting), Vitest (Testing), Alchemy (IaC).

## Key Development Commands
- `bun dev` - Start all applications in development mode.
- `bun run build` - Build all apps and packages.
- `bun run check-types` - Run TypeScript type checking across the workspace.
- `bun run db:generate` - Generate Drizzle migrations from schema changes.
- `bun run db:push` - Push schema changes directly to the database.
- `bun run deploy` - Deploy the stack to Cloudflare via Alchemy.
- `bun run test` - Run the test suite using Vitest.
- `bun run reset:password` - CLI tool to reset the admin password.

## Engineering Standards & Conventions

### 1. Code Style (Biome)
The project uses **Biome** for linting and formatting. Always run `biome check --write` before finalizing changes.
- **Indentation:** Tabs.
- **Line Width:** 100 characters.
- **Quotes:** Double quotes.
- **Semicolons:** Always required.

### 2. Validation (Zod)
- All API inputs and environment variables MUST be validated using **Zod**.
- Shared schemas should reside in `packages/validators/src`.

### 3. Database & Schema
- The system assumes a **single-user (Admin)** model. Authentication guards in `packages/api/src/index.ts` check for a valid session.
- Schema changes must be made in `packages/db/src/schema/*.ts` and exported via `packages/db/src/schema/index.ts`.
- Always run `bun run db:generate` after schema changes.

### 4. UI/UX Patterns
- **Fonts:** `Montserrat` for display/headers, `Roboto` for sans/body.
- **Components:** Prefer Radix UI primitives and the shared library in `packages/ui`.
- **Images:** Use the `ImageUploadField` component for file uploads; it communicates with the R2-backed `/api/upload` endpoint.
- **Animations:** Use the `useEntranceAnimation` hook for staggered entry effects.

### 5. API Development (tRPC)
- Define new procedures in `packages/api/src/routers`.
- Use `publicProcedure` for unauthenticated endpoints (like the public profile) and `protectedProcedure` for admin-only operations.

### 6. Storage (R2)
- Avatars and banners are stored in Cloudflare R2.
- Uploads are handled via `POST /api/upload` on the server Worker.
- Images are served via `GET /api/images/*` with optimized cache headers.

## Directory Navigation
- **Logic changes:** Look in `packages/api` (routers) or `apps/server` (entry point).
- **UI changes:** Look in `apps/web/src/components` or `packages/ui/src/components`.
- **Schema changes:** Look in `packages/db/src/schema`.
- **Validation changes:** Look in `packages/validators/src`.

---
*Note: This GEMINI.md is a living document. Update it when significant architectural changes occur.*

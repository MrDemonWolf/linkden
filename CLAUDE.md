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

- `bun dev` — Start all apps in development mode
- `bun run build` — Build all apps and packages
- `bun run check-types` — TypeScript type checking
- `bun run db:generate` — Generate Drizzle migrations
- `bun run db:push` — Push schema to database
- `bun run deploy` — Deploy to Cloudflare via Alchemy
- `bun run destroy` — Tear down Cloudflare resources

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

## Design Patterns

### File Storage (R2)
- **Bucket binding:** `IMAGES_BUCKET` (R2Bucket on Cloudflare Workers)
- **Upload endpoint:** `POST /api/upload` — accepts `file` + `purpose` form fields, returns `{ publicUrl }`
- **Serving endpoint:** `GET /api/images/*` — serves from R2 with immutable cache headers
- **Valid purposes:** `avatar`, `banner`, `og_image`, `wallet_logo`
- **Client component:** `ImageUploadField` — drag-and-drop upload with preview, replace, and remove buttons
- **Max file size:** 5MB, images only

### UI/UX Patterns
- **Color pickers:** hex `<Input>` + native `<input type="color">` swatch side by side
- **Image uploads:** always use `ImageUploadField` (never plain URL text inputs)
- **Form layouts:** `FieldGroup` component with `columns` prop for grid layouts
- **Metrics:** `StatCard` component (icon, label, value, color)
- **Page headers:** `PageHeader` with optional badge and description
- **Entrance animations:** `useEntranceAnimation` hook with staggered `getAnimationProps(index)`
- **Section grouping:** uppercase `tracking-wider` label headers (`text-xs font-medium text-muted-foreground`)

### Wallet Pass
- Apple HIG generic pass layout (header → primary + thumbnail → secondary → QR)
- QR generation via `qrcode` library (`QRCode.toDataURL`)
- Preview component: `WalletPassPreview` with live color/content props

### Admin Panel
- Wrap sections in `Card` / `CardContent`
- Section headers: `<h2 className="text-sm font-semibold">`
- Settings forms: state pairs (current + saved) for dirty detection, save button appears when dirty

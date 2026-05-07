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

- `bun dev` — Start all apps in development mode (web :3001, server :3000, docs :3002)
- `bun dev:web` — Start Next.js frontend only
- `bun dev:server` — Start Cloudflare Workers API only
- `bun dev:docs` — Start docs site only
- `bun run build` — Build all apps and packages
- `bun run check-types` — TypeScript type checking
- `bun test` — Run Vitest test suite
- `bun test:watch` — Run tests in watch mode
- `bun run db:generate` — Generate Drizzle migrations
- `bun run db:push` — Push schema to database
- `bun db:reset` — Wipe local DB state (`.wrangler/state`)
- `bun ship` — Build and deploy to Cloudflare via Alchemy IaC
- `bun run destroy` — Tear down Cloudflare resources
- `bun reset:password` — Reset admin password via CLI
- `bun reset:factory` — Factory-reset all data and settings

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

## Compliance Audits

- GDPR compliance audit (2026-03-31): `docs/gdpr-audit.md`
- ISO 27001:2022 gap analysis (2026-03-31): `docs/iso27001-gap-analysis.md`

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
- **Social icon shape:** `SocialIconShapeSection` component — `"circle"` | `"rounded-square"`, setting key `social_icon_shape`
- **Consent banner:** `consent_banner_enabled` + `consent_banner_text` settings, shown on public page footer
- **MapKit:** `mapkit_enabled` + `mapkit_token` settings, used by Location blocks for Apple Maps embed
- **Admin branding:** `admin_branding_enabled` setting — controls LinkDen logo/name inside admin panel
- **Connections page:** `/admin/connections` — contact form submissions inbox (tRPC `forms.*` router); uses split-panel list+detail layout same as builder

### Wallet Pass
- Apple HIG generic pass layout (header → primary + thumbnail → secondary → QR)
- QR generation via `qrcode` library (`QRCode.toDataURL`)
- Preview component: `WalletPassPreview` with live color/content props

### Admin Panel
- Wrap sections in `Card` / `CardContent`
- Section headers: `<h2 className="text-sm font-semibold">`
- Settings forms: state pairs (current + saved) for dirty detection, save button appears when dirty
- Setup wizard: `/admin/setup` — 4-step split-panel onboarding (Account → Profile → Theme → Done); redirects to `/admin/login` if account already exists
- Login page: `/admin/login` — split-panel layout; left side customizable via branding settings (`branding_login_*`)

### Settings Key Groups
All settings stored as key-value in `site_settings` table. Key whitelist enforced in `packages/api/src/routers/settings.ts`.
- **Profile:** `profile_name`, `bio`, `avatar_url`, `verified_badge`
- **Appearance:** `theme_preset`, `theme`, `custom_primary/secondary/accent/background`, `custom_css`, `banner_*`, `social_icon_shape`
- **SEO:** `seo_title`, `seo_description`, `seo_og_image`, `seo_og_mode`, `seo_og_template`
- **Branding:** `branding_enabled`, `branding_text`, `branding_link`, `branding_logo_url`, `branding_favicon_url`, `branding_site_name`, `branding_pp_url`, `branding_tos_url`, `admin_branding_enabled`
- **Features:** `wallet_pass_enabled`, `vcard_enabled`, `contact_form_enabled`, `mapkit_enabled`, `mapkit_token`
- **Auth/CAPTCHA:** `magic_link_enabled`, `captcha_provider`, `captcha_site_key`, `captcha_secret_key`
- **Email:** `email_provider`, `email_api_key`, `email_from`, `contact_delivery`
- **System:** `default_color_mode`, `timezone`, `consent_banner_enabled`, `consent_banner_text`

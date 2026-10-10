# LinkDen

Self-hosted link-in-bio application built for Cloudflare-first deployment.

## Project Structure

- `apps/web` — Next.js frontend (public page + admin panel)
- `apps/server` — Hono API on Cloudflare Workers with tRPC
- `apps/docs` — Fumadocs documentation site
- `packages/ui` — Custom UI component library (Base UI `@base-ui/react` + CVA + Tailwind; Radix-free)
- `packages/api` — tRPC router definitions
- `packages/auth` — Better Auth configuration
- `packages/db` — Drizzle ORM schema + D1/SQLite client
- `packages/env` — Shared environment variable validation
- `packages/config` — Shared TypeScript configuration
- `packages/infra` — Alchemy IaC for Cloudflare deployment
- `packages/validators` — Shared Zod validation schemas
- `packages/email` — Email templates (React Email)

## Commands

- `bun dev` — Start all apps via `alchemy dev` (web :3001, server :3000, docs :3002). Applies
  migrations automatically, but needs `ALCHEMY_STATE_TOKEN` (the state store is the shared
  `alchemy-state` worker). `apps/web/.env` and `apps/server/.env` are loaded only here.
- `bun dev:web` — Start Next.js frontend only
- `bun dev:server` — Start the API with `wrangler dev` only (no Alchemy, no state token). Apply
  migrations to its local D1 by hand: see `docs/dev-tunnel-testing.md`.
- `bun dev:docs` — Start docs site only
- `bun run build` — Build all apps and packages
- `bun run check-types` — TypeScript type checking
- `bun run test` — Run Vitest test suite (note: `bun test` uses Bun's own runner, not Vitest)
- `bun run test:watch` — Run tests in watch mode
- `bun run test:coverage` — Run tests with V8 coverage + thresholds
- `bun run test:e2e` — Run Playwright e2e suite (`e2e/*.spec.ts`, split from Vitest; `PW_BASE_URL`
  overrides the web origin, `PW_API_URL` (default `http://127.0.0.1:3000`) the API origin for the
  direct `public.getPage` check)
- `bun run test:all` — Vitest then Playwright
- `bun run db:generate` — Generate Drizzle migrations (no credentials needed; contributors only).
  There is no `db:push` script: push/studio bypass the migration ledger and the 0007 trigger.
  `bunx drizzle-kit push|studio` need `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_D1_DATABASE_ID`,
  `CLOUDFLARE_D1_TOKEN` and must only target a throwaway DB. Migrations are applied by Alchemy
  (`bun dev` / `bun ship`).
- `bun db:reset` — Wipe both local dev stores (`.alchemy/miniflare` for `bun dev`,
  `apps/server/.wrangler/state` for `bun dev:server`)
- `bun ship` — Build and deploy to Cloudflare via Alchemy IaC
- `bun run destroy` — Tear down Cloudflare resources. Refuses the `prod` stage unless
  `LINKDEN_CONFIRM_DESTROY_PROD=yes`; prod D1/R2 are kept (`delete: false`) once a deploy has
  recorded it. Staging: `ALCHEMY_STAGE=<stage> bun run destroy`.
- `bun reset:password -- --email <e> [--disable-2fa] [--remote] [--db <name>]` — Reset the admin
  password. The password comes from a hidden prompt, stdin or `LINKDEN_RESET_PASSWORD` (never
  argv), is hashed with Better Auth's scrypt, signs every session out, and fails when no account
  matches. Locally it updates both dev stores; `--remote` targets `--db`, then `LINKDEN_DB_NAME`,
  then `linkden-db` (run from the repo root). `--disable-2fa` also turns two-factor off.
- `bun reset:factory -- --confirm [--remote] [--confirm-db <name>]` — Factory-reset all data in
  one atomic batch over every data table (table list read from the DB; migrations ledger kept).
  Remote asks you to type the DB name (or pass `--confirm-db`).

## 📚 CRITICAL DOCUMENTATION PATTERN
**ALWAYS ADD IMPORTANT DOCS HERE!** When you create or discover:
- Architecture diagrams → Add reference path here
- Database schemas → Add reference path here
- Problem solutions → Add reference path here
- Setup guides → Add reference path here

This prevents context loss! Update this file IMMEDIATELY when creating important docs.

## Dev / Testing Docs

- Tunnel testing (view dev app on phone via cloudflared quick tunnel, single-origin
  rewrites, Playwright split suite): `docs/dev-tunnel-testing.md`. `DEV_LOGIN` cannot work
  through a tunnel, by design.
- Worker-entry route tests: `apps/server/src/__tests__/routes.test.ts` (mocks
  `@linkden/env/server`, `@linkden/db` via `createTestDb` and `@linkden/auth`, calls
  `worker.fetch` with fake RL/R2 bindings, `// @vitest-environment node`).
- Router integration tests for admin routers live in `packages/api/src/routers/__tests__/`.
- Stack drift from the Better-T-Stack template (docs app pins, `@linkden/env/web`):
  `docs/better-t-stack-drift.md`

## Compliance Audits

- GDPR compliance audit (2026-03-31, status update 2026-10-08): `docs/gdpr-audit.md`
- ISO 27001:2022 gap analysis (2026-03-31, status update 2026-10-08): `docs/iso27001-gap-analysis.md`

## Release Planning

- Changelog (dual-audience: ✨ user / 🔧 technical): `CHANGELOG.md` (mirrored in
  `apps/docs/content/docs/changelog.mdx`)
- Releases: bumping `version.json` on `main` tags `vX.Y.Z` and publishes a GitHub release
  (`.github/workflows/release.yml`), which is what `version.checkUpdate` compares against.

## Tech Stack

- **Frontend:** Next.js 16, React 19, Tailwind CSS v4, Base UI (`@base-ui/react`)
- **Backend:** Hono, tRPC v11, Cloudflare Workers
- **Database:** Drizzle ORM, Cloudflare D1 (SQLite)
- **Auth:** Better Auth (email/password, TOTP 2FA with backup codes, optional magic link)
- **Deployment:** Cloudflare Workers (web via OpenNext + API), deployed only through Alchemy

## Production Hardening (invariants to preserve)

Key production-readiness invariants — don't regress these:

- **Single admin, enforced in the DB.** A `BEFORE INSERT` trigger on `user`
  (`packages/db/src/migrations/0007_single_admin_trigger.sql`) aborts a second
  insert; middleware 403 is just a nicer message. Not middleware-only. Optional
  `SETUP_TOKEN` secret: when bound, the first signup must send a matching
  `x-setup-token` header (constant-time compare, `apps/server/src/lib/setup-token.ts`;
  the setup wizard has an optional field), else 403 `Invalid setup token`. Unset = open
  first-run window, so set it on any public deploy.
- **Auth options live in `createAuthOptions`** (`packages/auth/src/auth-options.ts`); never
  configure `betterAuth` inline in `index.ts` (it only wires env, D1, Resend and secret
  validation). Tests build instances from the same factory.
  - `BETTER_AUTH_SECRET` fails closed: empty, or (on any non-loopback `BETTER_AUTH_URL`) under
    32 characters / a placeholder → Better Auth is never built, `/api/auth/*`, `/trpc/*`,
    `/api/upload`, `/api/admin/*` answer 503 and `/api/health` reports `auth: "misconfigured"`.
  - The admin is created with `emailVerified = true` (magic-link verify would otherwise wipe the
    password and sessions; migration 0009 backfills existing installs).
  - 2FA (`twoFactor({ issuer: "LinkDen" })`, table `two_factor`, migration 0008): enabled only
    after the first TOTP code verifies; password sign-in then returns `twoFactorRedirect` and the
    login page asks for the TOTP or a backup code. Never ship a 2FA path without the login step.
  - Magic link: single admin only, refused while 2FA is on, `disableSignUp`, 10-minute expiry,
    enabled-gate in a before-hook (403 before any token is stored), unknown addresses get the same
    `{status:true}` with nothing stored or sent. The server also 403s both
    `/api/auth/sign-in/magic-link` and `/api/auth/magic-link/*` unless `magic_link_enabled` is
    exactly `"true"`.
  - Change email is two-step (confirm from the current address, then verify the new one) and
    returns 400 when no Resend key is configured. Password reset revokes every session.
  - `DEV_LOGIN` needs `DEV_LOGIN="true"` AND a plain-http loopback `BETTER_AUTH_URL`; the endpoint
    404s for a non-loopback Host. Never bound by Alchemy.
- **Atomic multi-writes.** Backup import, block reorder/undo-insert, bulk settings, wallet
  config, retention prune, and danger resets run in a single `db.batch([...])` via
  `runBatch`/`settingUpsertStmt` (`packages/api/src/utils/settings.ts`). Never
  reintroduce sequential-await write loops. `danger.resetEverything` derives its table list from
  every `SQLiteTable` in `@linkden/db/schema` (user last), so new tables are wiped automatically.
- **Canonical settings registry.** `packages/validators/src/settings-registry.ts`
  is the single source for each key's sanitizer kind (`text`/`url`/`color`/`css`/
  `timezone`/`emailFrom`/`apiKey`/`boolean`/`enum` + `values`/`opaque`), max length,
  secret/mask, and backup policy. Every text/opaque key declares a `maxLength`;
  `*_enabled` flags are `boolean` (only `"true"`/`"false"`); preset/mode keys are
  `enum` with exported value lists (`THEME_PRESET_NAMES`, `BANNER_PRESET_IDS`,
  `CAPTCHA_PROVIDERS`, …) that parity tests pin to the UI catalogues. Opaque keys may declare
  `validate` (vcard_data, consent_categories, wallet field/location JSON, relevant date, signing
  material). `sanitizeSetting` rejects with `BAD_REQUEST`. Settings/wallet/vcard/backup routers
  all write through it — don't add drifting key lists. Public reads use
  `PUBLIC_PAGE_SETTING_KEYS` (never secret rows); packages that can't import the api utils use
  `readSettings` from `@linkden/db/settings-read`.
- **Server-derived request data.** `requestMeta` returns only `{ ip (cf-connecting-ip),
  country (cf-ipcountry) }`. No user agent is collected (analytics `user_agent` is written NULL)
  and the Referer header is not used. `referrer` is the one client-supplied analytics field
  (`document.referrer`, stored as its lowercased hostname only, dropped for the site's own host).
  Better Auth IP header = `cf-connecting-ip`.
- **CAPTCHA** (`packages/api/src/utils/captcha.ts`): provider enum (`turnstile` / `recaptcha` v2
  checkbox / `hcaptcha`), fails closed (empty secret = misconfigured), times out, sends
  `remoteip`, requires hostname === the `CORS_ORIGIN` hostname whenever it is set (fails closed
  if unparseable), always requires action `contact` for Turnstile, and for reCAPTCHA v3 (score
  present) action `contact` + score ≥ 0.5. `getPage` exposes `captchaProvider` + `captchaSiteKey`
  only; the public contact form renders the widget (`components/public/captcha-widget.tsx`) and
  the CSP in `apps/web/next.config.ts` (`contentSecurityPolicy()`) allows the provider origins.
- **Rate limits apply per call, not per URL.** Cloudflare RL bindings: `RL_AUTH` 10/60s,
  `RL_STRICT` 5/60s, `RL_UPLOAD` 20/60s, `RL_PUBLIC` 60/60s, `RL_SIGNIN` 30/60s (constant keys
  `global:sign-in` / `global:two-factor` / `global:password-reset`), `RL_OG` 10/60s on the web
  worker. Keys are the client IP with IPv6 collapsed to /64. A Hono `/trpc/*` middleware parses
  the batch like tRPC does and spends one token per `public.submitContact` (RL_AUTH) /
  `trackView` / `trackClick` (RL_PUBLIC) call; batches are capped at 20 (`maxBatchSize`, keep ≥ the
  web client's `maxItems`) and oversize/undecodable batches get 400. `packages/api` must not add
  a second limiter on the same bindings. Better Auth's own limiter is explicitly on
  (`rateLimit: { enabled: true }`, in-memory per isolate) and stacks on top.
- **Same-origin writes + body limits.** POSTs to `/trpc/*` and `/api/upload` must come from
  `CORS_ORIGIN` or the request's own origin (Sec-Fetch-Site fallback), else 403. Body limits:
  64KB `/api/auth/*`, 1MB `/trpc/*`, 16MB for `backup.*`. tRPC `errorFormatter` strips stacks and
  replaces INTERNAL_SERVER_ERROR messages; raw causes are logged server-side.
- **Logging never carries tokens or visitor PII.** The request line is path-only
  (`METHOD path status ms`, reset-password token segment redacted, no query strings) — never
  reintroduce `hono/logger`. Workers invocation logs are off (`observability.logs.invocationLogs:
  false` in `alchemy.run.ts`) because they record full URLs. `logError`
  (`apps/server/src/lib/log.ts`) strips Drizzle bound params from messages and stacks.
- **Uploads:** magic-byte signature check + `Content-Length` precheck. `replaces` is honoured
  only for a same-purpose key that no saved setting or block references (normally an unsaved
  upload from the same edit); a saved/live object is never deleted on replace. Saved-then-replaced
  objects are removed by the daily orphan sweep (24h grace) (`apps/server/src/lib/upload-validation.ts`).
- **Retention cron:** daily `scheduled()` handler prunes analytics (365d)/contacts (365d)/audit
  (180d)/expired sessions/expired `verification` rows in one batch, then sweeps orphan R2 images
  (`apps/server/src/lib/retention-sweep.ts`, `packages/db/src/retention.ts`, windows in
  `@linkden/validators/retention`). Each failed step logs a structured line (path `scheduled`,
  step `prune` | `orphan-sweep`) and the run rejects with an `AggregateError`, so Cron Events show
  it failed. `audit_log` IS included in full/factory resets.
- **Version:** single source `version.json` + `compareSemver`
  (`packages/api/src/utils/version.ts`). No hardcoded versions. `version.checkUpdate` is
  admin-only, 5s timeout, per-isolate cache (6h ok / 10min failure; `force: true` skips it but
  reuses an answer under 60s old).
- **Deployment is Cloudflare-only, through Alchemy** (Docker/Coolify/Railway removed).
  - `deploy.yml` deploys only `workflow_run.event == 'push'` from this repo's `main` (fork PRs
    named `main` can't deploy), never cancels a running deploy, runs a preflight that names
    missing secrets/vars, records a D1 Time Travel bookmark before deploying, and smoke-tests web.
  - `alchemy.run.ts` validates the deploy env before touching state (`deployEnvErrors` in
    `packages/infra/deploy-config.ts`: non-empty values, `BETTER_AUTH_SECRET` ≥ 32 chars and not
    Better Auth's default, https URLs, bare-origin `CORS_ORIGIN`, all equal to
    `https://SITE_DOMAIN` when it is set).
  - `LINKDEN_DB_NAME` / `LINKDEN_IMAGES_BUCKET` overrides apply to the `prod` stage only.
  - Prod D1/R2 use `delete: false`; a prod destroy needs `LINKDEN_CONFIRM_DESTROY_PROD=yes`.
  - The Workers compatibility date is pinned (`COMPATIBILITY_DATE` in `alchemy.run.ts`,
    2026-04-24); bump it together with `apps/server/wrangler.jsonc`.
  - Migrations must be additive (expand/contract) so a code-only `wrangler rollback` is safe.
  - CI actions are SHA-pinned with minimal permissions; `/api/health` checks D1 (logs the error
    when degraded) + reports version and auth state.
- **Test DB:** integration tests use the in-memory libsql helper
  `@linkden/db/testing` (`createTestDb`). Coverage floors (per glob: api utils, routers,
  validators, server lib, upload-validation, retention, infra deploy-config, scripts/lib) are
  enforced in `vitest.config.ts`; Vitest excludes `.claude/**` worktrees. Run `bun run test` /
  `bun run test:coverage` (NOT `bun test`). CI runs Vitest once (`test:coverage`).

## Design Patterns

### File Storage (R2)
- **Bucket binding:** `IMAGES_BUCKET` (R2Bucket on Cloudflare Workers)
- **Upload endpoint:** `POST /api/upload` — accepts `file` + `purpose` (+ optional `replaces`) form fields, returns `{ publicUrl }`
- **Serving endpoint:** `GET /api/images/*` — 404s key shapes the app never writes (`<purpose>/<uuid|ms-timestamp>.<ext>`) without reading R2; serves with immutable cache headers + `ETag` and edge-caches via `caches.default` (cache key without the query string). Edge copies are never purged (keys are random and never reused), so an orphan-swept image may linger in a colo cache until evicted.
- **Valid purposes:** `UPLOAD_PURPOSES` in `@linkden/validators/uploads` (`avatar`, `banner`, `og_image`, `wallet_*`, `logo`, `favicon`, `login_*`, `block_thumbnail`, `block_image`)
- **Client component:** `ImageUploadField` — drag-and-drop upload with preview, replace, and remove buttons. Sends `replaces` only for an upload it made during the current unsaved edit (tracked with `unsavedEditSnapshot()` from `hooks/use-unsaved-changes.ts`; any form save, discard or close ends the edit) — never the saved value. Without a `label` it is wrapped in `<fieldset><legend>` so its Replace/Re-crop/Remove buttons get group context.
- **Max file size:** 5MB, images only — `Content-Length` rejected before buffering; magic-byte signature must match the extension (`signatureMatchesExt`)
- **Cleanup:** the server deletes only a `replaces` key nothing references; saved objects superseded by a later save are reclaimed by the daily orphan sweep (24h grace)

### UI/UX Patterns
- **Color pickers:** `ColorField` — hex `<Input>` + native `<input type="color">` swatch, with a contrast guard
- **Image uploads:** always use `ImageUploadField` (never plain URL text inputs)
- **Write-only secrets** (email API key, CAPTCHA secret, MapKit token): `SecretInput` (`components/admin/settings/secret-input.tsx`) — mask selected on focus, never kept in an edit, `autoComplete="new-password"`
- **Mutation errors:** `mutationErrorMessage` (`components/admin/settings/mutation-error.ts`) shows a router's deliberate 4xx message, falls back for 5xx / zod issue lists
- **Form controls:** `--input-border` token (`border-input-border`) is the 3:1 control boundary (WCAG 1.4.11) for Input, Select trigger, Textarea, InputGroup, Checkbox and the off Switch; `--input` is fill-only. Hand-rolled fields use `border-input-border`, never `border-input`. The `Alert` primitive has no default `role` — pass it explicitly.
- **Form layouts:** `FieldGroup` component with `columns` prop for grid layouts
- **Metrics:** `StatCard` component (icon, label, value, optional href/trend/subtitle)
- **Page headers:** `PageHeader` (h1 · badge · actions; optional `kicker` sub-tab label reported to the shell top bar)
- **Entrance animations:** `useEntranceAnimation` is used on Insights only — admin pages have no page fade
- **Previewer:** `PagePreview` renders the real `PublicPage` with `previewMode` — never fork the public components for preview. Preview custom CSS is wrapped in `@scope(.ld-page)` with external fetches stripped (`lib/custom-css.ts`); the live page is unchanged.
- **Block editor validation:** shared zod schemas from `@linkden/validators` via `lib/validate.ts` `fieldError`/`configErrors`. `CollapsibleSection` makes collapsed content `inert` and has `forceOpen` (Schedule/Advanced open on a failed save). Config JSON must be a plain object. The Connect block's form has one "Ask where we met" toggle (`showWhereMet`); the question is asked only when it is set or the block uses the `connect` preset (`lib/contact-form.ts` `shouldAskWhereMet`).
- **Block icons:** resolved server-side in `app/page.tsx` (`lib/block-icons.ts` → `iconSvg` on each block); the public bundle ships no lucide dynamic map or brand catalog
- **Fonts:** Sora / DM Sans / Geist Mono; type scale `text-h1`..`text-micro` (12px floor)
- **Section grouping:** uppercase `tracking-wider` label headers (`text-xs font-medium text-muted-foreground`)
- **Social icon shape:** `SocialIconShapeSection` component — `"circle"` | `"rounded-square"`, setting key `social_icon_shape`
- **Social rows:** URL helpers in `components/admin/social/social-url.ts` (`buildSocialUrl`/`extractSocialHandle`/`handleFromUrl`) accept a pasted URL or `@handle`; unsaved edits are an overlay on the saved rows (`components/admin/builder/social-drafts.ts`), a network is deleted only via the trash button
- **Consent banner:** `consent_banner_enabled` (on by default) + `consent_banner_text`. With the banner on, analytics and embeds run only after the visitor opts in; with it off, analytics run for every visitor without asking. Choice stored as `{analytics, functional, marketing:false, v: CONSENT_VERSION (2), ts}`, expires after 12 months or on a version bump; footer "Cookie settings" reopens it (`openConsentPreferences`); Escape hides it for the view without recording. "functional" is shown as "Embedded media": with the banner on, embed blocks show a click-to-load placeholder until allowed. Categories schema: `@linkden/validators/consent`.
- **MapKit:** `mapkit_enabled` + `mapkit_token` settings are stored, but Location blocks currently render an address with an outbound map link only (Apple / Google / custom via `getMapUrl`); no map embed uses the token yet
- **Admin branding:** `admin_branding_enabled` setting — controls LinkDen logo/name and "Powered by LinkDen" inside the admin panel (AdminShell reads it, not the public `branding_enabled`)
- **Inbox page:** `/admin/inbox` — contact form submissions (tRPC `forms.*` router); split-panel list+detail, paginated ("Load older messages", `forms.count`), Select mode for bulk Mark read / Delete; header `Switch` saves `contact_form_enabled` instantly. Mailto links are percent-encoded (`components/admin/connections/mailto.ts`).
- **Insights time:** daily buckets follow the `timezone` setting (unset = UTC); `components/admin/analytics/daily-series.ts` + `admin-time-zone.ts`. Never build day labels with `new Date("YYYY-MM-DD")` in the viewer's zone.
- **Shared web modules:** `lib/admin-routes.ts` (`PUBLIC_ADMIN_ROUTES`, `hasSessionCookie`, used by `proxy.ts`), `lib/theme-colors.ts` (`getThemeColors`), `lib/contact-form.ts` (client mirror of `submitContact` rules)

### Public Page
- Root layout metadata is static; profile/SEO/OG/favicon/theme-colour metadata live in `app/page.tsx`, so admin routes, `/offline` and 404s never call `public.getPage`. An API outage on `/` throws → `app/error.tsx` (HTTP 500).
- `/og` runs on Node (no Edge runtime — OpenNext Cloudflare can't serve it) with the Workers Cache API keyed on the canonical URL. Anonymous requests always render the stored profile; only a session-cookie request (SEO live preview) renders query values, uncached.
- `public.getPage` is one D1 batch, honours privacy/terms URL vs text mode and `site_language` (`lang`).
- Service worker: `/sw.js?v=<version>`, cache `linkden-v4-<version>`, navigation preload, home cached under one `/` key, 2xx only.
- `/` sends `Accept-CH`/`Critical-CH: Sec-CH-Prefers-Color-Scheme` so a "system" colour mode server-renders correctly on Chromium.

### Wallet Pass
- Apple HIG generic pass layout (header → primary + thumbnail → secondary → QR)
- QR generation via `qrcode` library (`QRCode.toDataURL`) — preview only
- Preview component: `WalletPassPreview` with live color/content props (business-card style: gradient/texture surface, org kicker, avatar, big QR)
- Palette picker: `WALLET_PALETTES` in `wallet/color-palette-panel.tsx` — one tap sets bg/fg/label; custom fg/label `ColorField`s below
- **`.pkpass` generator:** `apps/server/src/lib/pkpass.ts` — signed bundle built entirely in the Workers runtime (`node-forge` PKCS#7 detached sig, `fflate` zip, Web Crypto SHA-1, hand-rolled solid-PNG icon fallback). Colors → `rgb()` (Apple requires it, not hex). QR = `barcodes[]` (Wallet renders it; not embedded). Field sections capped with `PASS_FIELD_LIMITS` (same as the preview, via `resolvePassContent`). A wrong passphrase fails with `Unable to load wallet signer key (wrong passphrase?)`.
- **Route:** `GET /api/admin/wallet-pass` in `apps/server/src/index.ts` — admin-only: needs a session (401 otherwise), RL_STRICT, `Cache-Control: private, no-store`; 404 when `wallet_pass_enabled` ("Downloads enabled" switch) is off, 503 when signing material is missing. Downloaded from Settings → Wallet. There is no public route and no footer button (the public footer offers only vCard). Do not reintroduce a public pass route.
- **Signing certs:** settings (`wallet_signer_cert/key`, `wallet_wwdr_cert`) override env (`WALLET_SIGNER_CERT/KEY`, `WALLET_WWDR_CERT`, `WALLET_TEAM_ID`, `WALLET_PASS_TYPE_ID`); optional `WALLET_SIGNER_KEY_PASSPHRASE` env for encrypted RSA keys. Accepted material: raw PEM, base64-wrapped PEM (unwrapped by `normalizeSigningMaterial`), or base64 DER for `.cer` certs; RSA keys only (no EC, no PKCS#12). `wallet.updateSigningKeys` normalizes and rejects unloadable material with BAD_REQUEST; `getSigningStatus` booleans mean "configured and loadable". Each saved key has "Clear saved" (writes `""` so env applies).
- **Context-aware relevance:** `relevantDate` + `locations[]` (`{latitude, longitude, relevantText}`, max 10 — `PASS_LOCATION_LIMIT`) → Wallet Lock Screen surfacing. Settings keys `wallet_relevant_date` (UTC ISO or `""`) + `wallet_locations` (JSON). Builder "Context-Aware" section: native `datetime-local` + repeatable location rows. Date stored UTC ISO, edited as `datetime-local` (see `isoToLocal`/`localToIso`). Schema `passLocationSchema` in validators; written into pass.json by `buildPassJson`. Builder saves are validated with `passFieldSchema`/`passLocationSchema` (`components/admin/wallet/wallet-validation.ts`).

### vCard
- `resolvePublicVcard()` (`packages/api/src/routers/vcard.ts`) is the single source for `GET /api/vcard`: `?block=<id>` → that block's card (vCard block button), else the first visible vCard block in its schedule window, else the global `vcard_data` (Design → Branding). Reads only `vcard_enabled` + `vcard_data`. Output is RFC 6350 escaped, always has an `N` line.

### Admin Panel
- **Five destinations, path-segment sub-tabs** (no `?tab=`): `/admin/links[/profile|/social]` (home) · `/admin/design[/banner|/branding|/seo]` · `/admin/insights` · `/admin/inbox` · `/admin/settings[/email|/integrations|/wallet|/data]` (root = Account). `NAV_ITEMS` in `components/admin/nav-list.tsx` is the single source for the sidebar, the bottom tab bar (<lg) and the top-bar breadcrumb. Features tab is gone: each toggle sits next to what it toggles (messages → Inbox header, wallet downloads → Settings/Wallet header, vCard + consent → Design/Branding, MapKit + CAPTCHA → Settings/Integrations, magic link → Settings/Account).
- **Document titles:** every admin route has a server `layout.tsx` exporting metadata (`'<Page> · <Destination> · LinkDen Admin'`). New destinations and sub-tabs need one. `app/admin/settings/layout.tsx` is a server layout; its client sub-nav is `settings-shell.tsx`.
- **Legacy routes** (`/admin`, `/admin/builder`, `/admin/appearance`, `/admin/analytics`, `/admin/connections`, `/admin/forms`, `/admin/social`, `/admin/account`, `/admin/wallet`, `/admin/settings?tab=*`) get a real 307 from `proxy.ts` (`legacyAdminRedirect(pathname, tab)` runs before the auth gate so `?from=` carries the new path) and keep 7-line `redirect()` page shims as a fallback — the shims alone stream a 200 + client redirect because of `app/admin/loading.tsx`. Both derive from the pure map `lib/admin-redirects.ts` (tested in `lib/__tests__/admin-redirects.test.ts`). Add new moves there; `/admin/settings` without a tab must not redirect.
- **Preview slot contract** (`components/admin/preview-slot.tsx`): a page that should show the phone calls `usePreviewSlot({ overrides?, mode?, onModeChange?, panel?, altView? })` every render; the shell-owned `PreviewColumn` (≥lg, sticky, collapsible, dot-grid ground, `panel` replaces the phone at lg and stacks above it at xl) and the FAB + `MobilePreviewSheet` (<lg) read the same registration. `PreviewColumn` keeps `panel` mounted (hidden) while peeking or collapsed so block-editor state survives; peek is per panel key and resets when the editor closes. `PhoneFrame` content is `inert`, exposed as one `role="img"`. Pages never read the registration (two contexts, no render loops) and never render their own right column. `PageShell` + `PageHeader` (+ `SubTabs` in the destination layout) is the page skeleton; the tool column is 720px beside a preview, 880px alone.
- **State pill** (`state-pill.tsx`): `● Unsaved` comes from `useAnyUnsaved()` (module-level counter fed by every `useUnsavedChanges(dirty)`), `n unpublished` from `blocks.list`, else `● Live` — claimed only after `blocks.list` loads (neutral placeholder while loading, nothing on error). Keep every form on `useUnsavedChanges` so the pill and the navigation guard stay honest.
- **Unsaved guard:** one module-level guard (beforeunload, capture click, Navigation API `traverse` for Back/Forward) shared by every `useUnsavedChanges`, so the user is prompted once. `unsavedEditSnapshot()` exposes the current edit for `ImageUploadField`.
- Signal gradient only on the active nav item, the selected block row edge and the Unsaved pill; `--shadow-glow` only on the Unsaved pill and `+ Add block` hover; cards are matte (`bg-card border-border shadow-none`, no blur).
- Motion: preview collapse 220ms width + 120ms fade, Unsaved dot `animate-pulse-once` (600ms) — cut by the global `prefers-reduced-motion` rule in `index.css`. That rule is a universal selector, so any class with an `animation` shorthand must also be listed in the explicit `animation: none` block at the bottom of `index.css`. JS motion checks itself: `useEntranceAnimation` reads the media query, imperative smooth scrolls use `prefersReducedMotion()` from `hooks/use-reduced-motion.ts`.
- AdminShell sets `scroll-padding-top/bottom` on `<html>` while mounted (WCAG 2.4.11). The sidebar shortcut is Cmd+B (Apple) / Ctrl+B, ignored in editable fields and below md.
- Wrap sections in `Card` / `CardContent`
- Section headers: `<h2 className="text-sm font-semibold">`
- Settings forms: `useSettingsForm` scope per page + one `StickySaveBar` (sits above the bottom tab bar below lg). It saves only keys that differ from the saved baseline (still one `updateBulk`/`runBatch`), keeps unsaved edits across a refetch, and exposes `isError`/`error`/`refetch` for a `QueryError` retry state.
- Setup wizard: `/admin/setup` — 4-step split-panel onboarding (Account → Profile → Theme → Done); redirects to `/admin/login` if account already exists; optional Setup token field (sent as `x-setup-token`); `?test=true` prefill is dev-only
- Login page: `/admin/login` — split-panel layout; left side customizable via branding settings (`branding_login_*`). After password sign-in it shows a TOTP / backup-code step when Better Auth answers `twoFactorRedirect` (optional "trust this device for 30 days"). Honours `?from=` after every sign-in method, validated by `safeAdminRedirect` (`app/admin/login/redirect.ts`: plain `/admin` paths only, never login/setup/reset-password).
- Design → Theme: `custom_primary/secondary/accent/background` are true overrides — empty inherits the preset in light and dark; picking a preset clears them (`app/admin/design/theme-form.ts`).

### Settings Key Groups
All settings stored as key-value in `site_settings` table. Per-key metadata (whitelist, sanitizer kind, max length, secret/mask, backup policy) is centralized in `packages/validators/src/settings-registry.ts` — the settings/wallet/vcard/backup routers all derive from it. Add new keys there, not in ad-hoc lists.
- **Profile:** `profile_name`, `bio`, `avatar_url`, `verified_badge`
- **Appearance:** `theme_preset`, `theme`, `custom_primary/secondary/accent/background`, `custom_css`, `banner_*`, `social_icon_shape`
- **SEO:** `seo_title` (max 100), `seo_description` (max 250), `seo_og_image`, `seo_og_mode`, `seo_og_template`, `site_language`
- **Branding:** `branding_enabled`, `branding_text`, `branding_link`, `branding_logo_url`, `branding_favicon_url`, `branding_site_name`, `branding_pp_url`, `branding_tos_url`, `admin_branding_enabled`
- **Features:** `wallet_pass_enabled`, `vcard_enabled`, `vcard_data`, `contact_form_enabled`, `mapkit_enabled`, `mapkit_token`
- **Auth/CAPTCHA:** `magic_link_enabled` (can't be turned on without email or while 2FA is on), `captcha_provider`, `captcha_site_key`, `captcha_secret_key`
- **Email:** `email_provider` (unset = Resend; other providers never send), `email_api_key`, `email_from`, `contact_delivery` (`database` / `email` / `both`; a failed or unconfigured email send falls back to the Inbox and is audited as `contact.email_failed`)
- **System:** `default_color_mode`, `timezone` (drives Insights day buckets; unset = UTC), `consent_banner_enabled`, `consent_banner_text`, `consent_categories`

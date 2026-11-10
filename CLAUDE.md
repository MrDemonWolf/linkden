# LinkDen

Self-hosted link-in-bio application built for Cloudflare-first deployment.

## Project Structure

- `apps/web` — Next.js frontend (public page + admin panel)
- `apps/server` — Hono API on Cloudflare Workers with tRPC
- `apps/docs` — Fumadocs documentation site
- `apps/public/build.ts` — Local static build reusing public components; not deployable until manifest gates pass
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
  `alchemy-state` worker). Alchemy loads `apps/web/.env` and `apps/server/.env` only in dev mode; standalone Next also loads its own `.env`/`.env.local`.
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
  direct `public.getPage` check). Its local web server runs `next dev` on `127.0.0.1` with the
  public URLs on the web origin and `INTERNAL_SERVER_URL` pointed at the API, so browser calls go
  through the filesystem API bridge.
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
- Current design-system guide: `DESIGN.md`, with reader-facing foundations, shared components and patterns in `apps/docs/content/docs/design-system/` (`/docs/design-system`). Update these when changing shared UI rules.
- Design-system screenshots: `scripts/design-screenshots/README.md`. Against a disposable worktree stack (API `127.0.0.1:3100` with `DEV_LOGIN=true`, web `127.0.0.1:3101`; never 3000/3001), run `bun scripts/design-screenshots/seed.ts` (replaces all content) then `bun scripts/design-screenshots/capture.ts [group...]`; WebP output + `manifest.json` per group in `apps/docs/content/docs/design-system/images/<group>/`. Modules are read-only (saved-state captures go in `stateful`); 250 KB/image, 8 MB total. Docs `source.config.ts` limits meta files to `**/meta.json` so those manifests are not parsed as page meta.
- Stale local previews: development `SwRegister` reuses `retireLegacyPublicWorker` to remove only LinkDen's root worker/cache. `public/sw.js` passes loopback fetches through because development chunk URLs are mutable. Regression tests: `components/__tests__/sw-register.test.tsx`, `lib/__tests__/service-worker-policy.test.ts`, and `components/public/__tests__/retire-service-worker.test.ts` in `apps/web/src/`. See the local-preview section in the troubleshooting guide; an already controlled tab releases its controller on the next navigation.

### Documentation site

`apps/docs` uses the installed Fumadocs Notebook layout with a top bar, one page-tree sidebar and a table of contents. Its neutral palette lives in `src/app/global.css`; Montserrat/Roboto/Geist Mono match the admin's type roles. Keep the existing deliberate dependency pins. Articles supply their title through frontmatter, so body content starts at `##` rather than repeating an H1.

Search is a static English Orama index exported by `src/app/api/search/route.ts`. The dialog loads `${NEXT_PUBLIC_BASE_PATH}/api/search`; the shared base path also prefixes plain logo/favicon URLs for the `/linkden` GitHub Pages build. Next links handle the configured base path. No dynamic search service or invented OG image route is required. Verify both root and `/linkden` static exports, and test search results in the browser after docs/navigation changes.

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
  insert; middleware 403 is just a nicer message. Not middleware-only. First run
  is WordPress-style on purpose: no setup token, whoever completes `/admin/setup`
  first becomes the admin, so the owner does it right after deploying.
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
    Guessing is capped: Better Auth ends a challenge after 5 wrong codes and `accountLockout`
    (5 consecutive failures → 1h) is set explicitly; a test fails if the lockout is turned off.
  - Magic link: single admin only, refused while 2FA is on, `disableSignUp`, 10-minute expiry,
    enabled-gate in a before-hook (403 before any token is stored), unknown addresses get the same
    `{status:true}` with nothing stored or sent. The server also 403s both
    `/api/auth/sign-in/magic-link` and `/api/auth/magic-link/*` unless `magic_link_enabled` is
    exactly `"true"`.
  - Change email is two-step (confirm from the current address, then verify the new one) and
    returns 400 when no Resend key is configured. With 2FA on, signed-out new-email verification
    (and a magic link issued before 2FA) cannot create a session (`databaseHooks.session.create`);
    the signed-in owner can still finish it. Password reset revokes every session.
  - `DEV_LOGIN` needs `DEV_LOGIN="true"` AND a strict plain-HTTP loopback `BETTER_AUTH_URL`; an explicit non-development runtime mode disables it. Request URL and Host must agree and stay local, as must Origin/Referer and any proxy metadata. Edge/tunnel headers cannot establish trust. Better Auth's first-login CSRF middleware validates Origin/Fetch Metadata even without a session cookie. Never bound by Alchemy; keep local listeners on loopback. The login button and setup test prefill also require a local development page, even when the public feature flag is set.
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
  material). `sanitizeSetting` (`packages/api/src/utils/sanitize-setting.ts`) rejects with `BAD_REQUEST`. Settings/wallet/vcard/backup routers
  all write through it — don't add drifting key lists. Public reads use
  `PUBLIC_PAGE_SETTING_KEYS` (never secret rows); packages that can't import the api utils use
  `readSettings` from `@linkden/db/settings-read`.
  Explicit magic-link enablement uses `assertMagicLinkAllowed` in the shared API settings
  utility for scalar/bulk saves and backup imports. It checks the resulting email transport
  and 2FA state; replace restores retain only the secrets that survive replacement. A rejected
  enablement is skipped during restore, while a database failure aborts the operation.
- **Profile collection is retired.** `public.trackView` and `public.trackClick` reject bounded legacy payloads with NOT_FOUND. The public page and its buttons send no collection calls, and the admin shortcut performs no session probe. Historical tables and protected read queries remain available. `requestMeta` still derives transient security metadata from Cloudflare headers; no new analytics identities or event rows are stored. Better Auth IP header = `cf-connecting-ip`.
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
  worker. Server and OG share `@linkden/validators/rate-limit`, which collapses IPv6 to /64. A Hono `/trpc/*` middleware parses
  the batch like tRPC does and spends one token per `public.submitContact` (RL_AUTH) /
  `trackView` / `trackClick` (RL_PUBLIC) call; batches are capped at 20 (`maxBatchSize`, keep ≥ the
  web client's `maxItems`) and oversize/undecodable batches get 400. `packages/api` must not add
  a second limiter on the same bindings. Better Auth's own limiter is explicitly on
  (`rateLimit: { enabled: true }`, in-memory per isolate) and stacks on top.
- **Same-origin writes + body limits.** POSTs to `/trpc/*` and `/api/upload` must come from
  `CORS_ORIGIN` or the request's own origin (Sec-Fetch-Site fallback), else 403. Body limits:
  64KB `/api/auth/*`, 1MB `/trpc/*`, 16MB only when every procedure in the batch is `backup.*`
  (the web client's `splitLink` sends `backup.*` calls as their own request).
  `bodyWithinLimit` (`apps/server/src/lib/body-limit.ts`) counts actual bytes even when
  Content-Length understates them, bounds its buffer, and cancels oversized streams before parsing
  or side effects. Uploads and the public contact action use the same counter. Don't add a second
  inline counter in `index.ts`. tRPC `errorFormatter` strips stacks and
  replaces INTERNAL_SERVER_ERROR messages; raw causes are logged server-side.
- **Shared web API transport.** The filesystem API bridge uses the Cloudflare service binding, or a validated plain-HTTP loopback transport for local requests. `lib/api-proxy.ts` strips hop-by-hop, forwarding and `cf-*` headers (keeping `cf-connecting-ip` only from a trusted edge), rejects encoded slashes, unknown methods, loops and Connection-nominated auth/CSRF headers, and marks responses `private, no-store` except successful GET/HEAD `/api/images/*` reads, which keep the API's immutable `Cache-Control` + `ETag` (keys are random and never reused); the API's own body limits stay authoritative. Deployed, OpenNext reads non-GET/HEAD bodies into the web worker's memory before the bridge runs (bounded only by Cloudflare's per-plan request size), so those limits decide the status, not how much the web worker buffers. SSR shares that binding lookup and honors only a bare loopback `INTERNAL_SERVER_URL`. Explicit `DEV_API_ORIGIN` tunnel rewrites run before filesystem handlers in development only; the API still independently rejects tunneled development login.
- **Logging never carries tokens or visitor PII.** The request line is path-only
  (`METHOD path status ms`, reset-password token segment redacted by `redactLogPath`, which
  `logError` also applies to its `path`; no query strings) — never reintroduce `hono/logger`. Workers invocation logs are off (`observability.logs.invocationLogs:
  false` for both API and web in `alchemy.run.ts`, pinned by `deploy-config.test.ts`) because they
  record full URLs; the web worker serves reset-password links and bridges `/api/auth/*`. `logError`
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
  - Legacy: the browser only ever talks to the site origin. With `SITE_DOMAIN`, zone Routes send
    `/api/*` + `/trpc/*` to the API worker; without it (workers.dev, admin included) the web
    worker's filesystem bridge (`app/api/[[...path]]`, `app/trpc/[[...path]]` →
    `lib/api-proxy.ts`) forwards them over the `API` service binding to the fixed
    `https://api.internal` origin. There is no custom web Worker entrypoint: in split mode,
    split ingress (`apps/server/src/lib/split-ingress.ts`) admits only binding traffic addressed
    to `https://api.internal` plus the optional exact `PUBLIC_CONTACT_URL` action, so a
    passthrough entry would 404. Keep the bridge prefixes in step with the Routes.
  - `deploy.yml` deploys only `workflow_run.event == 'push'` from this repo's `main` (fork PRs
    named `main` can't deploy), never cancels a running deploy, runs a preflight that names
    missing secrets/vars, records a D1 Time Travel bookmark before deploying, and smoke-tests web.
  - `alchemy.run.ts` validates the deploy env before touching state (`deployEnvErrors` in
    `packages/infra/deploy-config.ts`: non-empty values, `BETTER_AUTH_SECRET` ≥ 32 chars and not
    Better Auth's default, https URLs, bare-origin `BETTER_AUTH_URL`/`CORS_ORIGIN`/
    `NEXT_PUBLIC_SERVER_URL` (the error never echoes the value), a bare-origin
    `NEXT_PUBLIC_SITE_URL` (one trailing slash allowed), and in legacy mode all equal to
    the site origin: `https://SITE_DOMAIN`, else `NEXT_PUBLIC_SITE_URL`'s).
  - `LINKDEN_DB_NAME` / `LINKDEN_IMAGES_BUCKET` overrides apply to the `prod` stage only.
  - `LINKDEN_SERVING_MODE` defaults to `legacy`. Opt-in `split` is an owner-approved routing
    cutover: require separate bare HTTPS `ADMIN_SITE_URL` and `PUBLIC_SITE_URL`, unset
    `SITE_DOMAIN`, point auth/CORS/browser API URLs at admin and `NEXT_PUBLIC_SITE_URL` at public.
    Existing resource identities are preserved; Alchemy owns the admin custom hostname,
    requests disabled workers.dev/preview URLs, and keeps private API access via the
    web service binding. Public API routes stay empty unless an explicit `PUBLIC_CONTACT_URL`
    names one exact HTTPS `/api/contact` action on a custom hostname distinct from admin
    (for example, `https://api.example.com/api/contact`). The route never adopts an unmanaged
    route. The server allows only POST/OPTIONS there and rejects other public ingress before
    auth or storage access; private web transports use the fixed `https://api.internal` binding
    origin. A bounded read-only provider guard checks both fixed workers before
    Alchemy starts: both `enabled` and `previews_enabled` must be explicitly false; only HTTP 404
    for absent first-setup workers is allowed. It checks again after finalization, where 404 also
    fails. Open aliases require explicit owner closure; the guard never changes provider settings.
    Legacy/dev/destroy do not perform these reads. The public native-assets worker remains owned
    by the separate publisher. This is
    source preparation, not proof of Access protection: owner-approved Access policies,
    alternate-URL closure readback (including existing version previews), a dedicated public
    contact ingress, and staged end-to-end proof are required before cutover. Split smoke checks
    use admin for health/editor OG and public for home; optional paired `CF_ACCESS_CLIENT_ID` /
    `CF_ACCESS_CLIENT_SECRET` headers go only to admin probes, never public or redirect targets.
    The serving mode is build-hashed and baked into Next; split admin `/` redirects to
    `/admin/links` before profile rendering. Changing a runtime binding alone cannot switch mode.
  - Prod D1/R2 use `delete: false`; a prod destroy needs `LINKDEN_CONFIRM_DESTROY_PROD=yes`.
  - The Workers compatibility date is pinned (`COMPATIBILITY_DATE` in `alchemy.run.ts`,
    2026-04-24); bump it together with `apps/server/wrangler.jsonc`.
  - Migration history is `0000`–`0015` (`0011_relative_image_paths` is a data-only upload-path
    rewrite, `0012` adds `contact_quota`, `0013`–`0015` the publication tables). New migrations
    must be additive (expand/contract) before relying on a code-only `wrangler rollback`. Historical migrations 0002, 0008 and 0010 remove data or
    columns, and 0011 rewrites stored upload URLs to relative paths; verify old code against the migrated schema, or restore the pre-deploy
    D1 Time Travel bookmark (which also rewinds later data).
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
- **Upload endpoint:** `POST /api/upload` — accepts `file` + `purpose` (+ optional `replaces`) form fields, returns `{ publicUrl }` (an origin-relative `/api/images/<purpose>/<id>.<ext>` path)
- **Stored as paths:** image settings and block `thumbnail`/`src` hold that relative path (`UPLOADED_IMAGE_PATH` / `imageUrlSchema` in `@linkden/validators/primitives`, accepted by the `url` setting kind), so images survive an origin change. Migration 0011 rewrote older absolute upload URLs; public renderers use `safeImageSrc` (`lib/safe-url.ts`), which also reduces any leftover absolute upload URL to its path.
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
- **Page headers:** `PageHeader` (h1 · badge · actions; optional `kicker` sub-tab label reported to the shell top bar)
- **Entrance animations:** admin pages avoid decorative entrance animation; actual loading indicators remain.
- **Previewer:** `PagePreview` renders the real `PublicPage` with `previewMode` — never fork the public components for preview. Preview custom CSS is wrapped in `@scope(.ld-page)` with external fetches stripped (`lib/custom-css.ts`); the live page is unchanged.
- **Block editor validation:** shared zod schemas from `@linkden/validators` via `lib/validate.ts` `fieldError`/`configErrors`. `CollapsibleSection` makes collapsed content `inert` and has `forceOpen` (Schedule/Advanced open on a failed save). Config JSON must be a plain object. The Connect block's form has one "Ask where we met" toggle (`showWhereMet`); the question is asked only when it is set or the block uses the `connect` preset (`lib/contact-form.ts` `shouldAskWhereMet`).
- **Block icons:** resolved server-side in `app/page.tsx` (`lib/block-icons.ts` → `iconSvg` on each block); the public bundle ships no lucide dynamic map or brand catalog
- **Fonts:** admin uses Montserrat / Roboto, public uses Sora / DM Sans, mono stays Geist Mono; type scale `text-h1`..`text-micro` (12px floor)
- **Section grouping:** use `SectionLabel` within a card and `SectionRule` for the shared dash, title, and hairline treatment; keep heading levels aligned with the surrounding section.
- **Social icon shape:** `SocialIconShapeSection` component — `"circle"` | `"rounded-square"`, setting key `social_icon_shape`
- **Social rows:** URL helpers in `components/admin/social/social-url.ts` (`buildSocialUrl`/`extractSocialHandle`/`handleFromUrl`) accept a pasted URL or `@handle`; unsaved edits are an overlay on the saved rows (`components/admin/builder/social-drafts.ts`), a network is deleted only via the trash button
- **Consent banner:** `consent_banner_enabled` + `consent_banner_text` control embedded-media consent. Analytics controls are retired; new choices store `analytics:false`, legacy choices remain parseable. `functional` is shown as Embedded media; with the banner enabled, embeds are click-to-load until allowed. The banner-off setting permits embeds directly. Choices expire after 12 months or a consent-version bump; footer Cookie settings reopens preferences. Saved custom copy is preserved and may need an operator review for obsolete wording.
- **Map links:** Location blocks render an outbound Apple / Google / custom map link via `getMapUrl`. Unused `mapkit_enabled` / `mapkit_token` configuration remains accepted for compatibility, but is not exposed by the Integrations UI and is untouched by CAPTCHA saves.
- **Admin branding:** `admin_branding_enabled` setting — controls LinkDen logo/name and "Powered by LinkDen" inside the admin panel (AdminShell reads it, not the public `branding_enabled`)
- **Inbox page:** `/admin/inbox` — contact form submissions (tRPC `forms.*` router); split-panel list+detail, paginated ("Load older messages", `forms.count`), Select mode for bulk Mark read / Delete; header `Switch` saves `contact_form_enabled` instantly. Mailto links are percent-encoded (`components/admin/connections/mailto.ts`).
- **Historical report time:** historical API day buckets follow the `timezone` setting (unset = UTC); Inbox timestamps use the same preference. Inbox timestamps use the shared `components/admin/analytics/admin-time-zone.ts` formatter. Never build day labels with `new Date("YYYY-MM-DD")` in the viewer's zone.
- **Shared web modules:** `lib/admin-routes.ts` (`PUBLIC_ADMIN_ROUTES`, `hasSessionCookie`, used by `proxy.ts`), `lib/theme-colors.ts` (`getThemeColors`), `lib/contact-form.ts` (client mirror of `submitContact` rules)

### Public Page
- Root layout metadata is static; profile/SEO/OG/favicon/theme-colour metadata live in `app/page.tsx`, so admin routes, `/offline` and 404s never call `public.getPage`. An API outage on `/` throws → `app/error.tsx` (HTTP 500). While no admin exists (`getPage` returns `profile: null`) `/` answers a 307 to `/admin/setup`; there is no Welcome splash.
- `/og` runs on Node (no Edge runtime — OpenNext Cloudflare can't serve it) with the Workers Cache API keyed on the canonical URL. Anonymous requests always render the stored profile; only a session-cookie request (SEO live preview) renders query values, uncached.
- `public.getPage` is one D1 batch, honours privacy/terms URL vs text mode and `site_language` (`lang`).
- Service worker: `/sw.js?v=<version>`, cache keyed by the worker's `CACHE_VERSION` and app version, navigation preload, home cached under one `/` key, 2xx only; redirected responses and responses ending outside the same-origin root are never cached. Local loopback requests bypass this caching policy.
- `/` sends `Accept-CH`/`Critical-CH: Sec-CH-Prefers-Color-Scheme` so a "system" colour mode server-renders correctly on Chromium.

### Wallet Pass
- Apple HIG generic pass layout (header → primary + thumbnail → secondary → QR)
- QR generation via `qrcode` library (`QRCode.toDataURL`) — preview only
- Preview component: `WalletPassPreview` renders the pass card directly with system typography, live color/content props, organization label, optional image, and QR; no phone frame.
- Palette picker: `WALLET_PALETTES` in `wallet/color-palette-panel.tsx` — one tap sets bg/fg/label; custom fg/label `ColorField`s below
- **`.pkpass` generator:** `apps/server/src/lib/pkpass.ts` — signed bundle built entirely in the Workers runtime (`node-forge` PKCS#7 detached sig, `fflate` zip, Web Crypto SHA-1, hand-rolled solid-PNG icon fallback). Colors → `rgb()` (Apple requires it, not hex). QR = `barcodes[]` (Wallet renders it; not embedded). Field sections capped with `PASS_FIELD_LIMITS` (same as the preview, via `resolvePassContent`). A wrong passphrase fails with `Unable to load wallet signer key (wrong passphrase?)`.
- **Route:** `GET /api/admin/wallet-pass` in `apps/server/src/index.ts` — admin-only: needs a session (401 otherwise), RL_STRICT, `Cache-Control: private, no-store`; 404 when `wallet_pass_enabled` ("Downloads enabled" switch) is off, 503 when signing material is missing. Downloaded from Settings → Wallet. There is no public route and no footer button (the public footer offers only vCard). Do not reintroduce a public pass route.
- **Signing certs:** settings (`wallet_signer_cert/key`, `wallet_wwdr_cert`) override env (`WALLET_SIGNER_CERT/KEY`, `WALLET_WWDR_CERT`, `WALLET_TEAM_ID`, `WALLET_PASS_TYPE_ID`); optional `WALLET_SIGNER_KEY_PASSPHRASE` env for encrypted RSA keys. Accepted material: raw PEM, base64-wrapped PEM (unwrapped by `normalizeSigningMaterial`), or base64 DER for `.cer` certs; RSA keys only (no EC, no PKCS#12). `wallet.updateSigningKeys` normalizes and rejects unloadable material with BAD_REQUEST; `getSigningStatus` booleans mean "configured and loadable". Each saved key has "Clear saved" (writes `""` so env applies).
- **Context-aware relevance:** `relevantDate` + `locations[]` (`{latitude, longitude, relevantText}`, max 10 — `PASS_LOCATION_LIMIT`) → Wallet Lock Screen surfacing. Settings keys `wallet_relevant_date` (UTC ISO or `""`) + `wallet_locations` (JSON). Builder "Context-Aware" section: native `datetime-local` + repeatable location rows. Date stored UTC ISO, edited as `datetime-local` (see `isoToLocal`/`localToIso`). Schema `passLocationSchema` in validators; written into pass.json by `buildPassJson`. Builder saves are validated with `passFieldSchema`/`passLocationSchema` (`components/admin/wallet/wallet-validation.ts`).

### vCard
- `resolvePublicVcard()` (`packages/api/src/routers/vcard.ts`) is the single source for `GET /api/vcard`: `?block=<id>` → that block's card (vCard block button), else the first visible vCard block in its schedule window, else the global `vcard_data` (Design → Branding). Reads only `vcard_enabled` + `vcard_data`. Output is escaped vCard 3.0 and always has an `N` line.

### Admin Panel
- **Four desktop destinations, path-segment sub-tabs** (no `?tab=`): `/admin/links[/profile|/social]` (home) · `/admin/design[/banner|/branding|/seo]` · `/admin/inbox` · `/admin/settings[/email|/integrations|/wallet|/data]` (root = Account). `NAV_ITEMS` in `components/admin/nav-list.tsx` is the single source for the sidebar, the bottom tab bar (<lg) and the top-bar breadcrumb. Features tab is gone: each toggle sits next to what it toggles (messages → Inbox header, wallet downloads → Settings/Wallet header, vCard + consent → Design/Branding, CAPTCHA → Settings/Integrations, magic link → Settings/Account).
- **Document titles:** every admin route has a server `layout.tsx` exporting metadata (`'<Page> · <Destination> · LinkDen Admin'`). New destinations and sub-tabs need one. `app/admin/settings/layout.tsx` is a server layout; its client sub-nav is `settings-shell.tsx`.
- **Legacy routes** (`/admin`, `/admin/builder`, `/admin/appearance`, `/admin/analytics`, `/admin/connections`, `/admin/forms`, `/admin/social`, `/admin/account`, `/admin/wallet`, `/admin/settings?tab=*`) get a real 307 from `proxy.ts` (`legacyAdminRedirect(pathname, tab)` runs before the auth gate so `?from=` carries the new path) and keep 7-line `redirect()` page shims as a fallback — the shims alone stream a 200 + client redirect because of `app/admin/loading.tsx`. Both derive from the pure map `lib/admin-redirects.ts` (tested in `lib/__tests__/admin-redirects.test.ts`). Add new moves there; `/admin/settings` without a tab must not redirect.
- **Preview slot contract** (`components/admin/preview-slot.tsx`): a page that should show the page preview calls `usePreviewSlot({ overrides?, mode?, onModeChange?, panel?, altView? })` every render; the shell-owned `PreviewColumn` (≥lg, sticky, collapsible, neutral canvas with a separate toolbar, `panel` replaces the preview at lg and stacks above it at xl) and the header Preview action + `MobilePreviewSheet` (<lg) read the same registration. `PreviewColumn` keeps `panel` mounted (hidden) while peeking or collapsed so block-editor state survives; peek is per panel key and resets when the editor closes. `PagePreviewViewport` content is `inert`, exposed as one `role="img"`. Pages never read the registration (two contexts, no render loops) and never render their own right column. `PageShell` + `PageHeader` (+ `SubTabs` in the destination layout) is the page skeleton. The tool column is at most 760px beside a preview; full-width views stop at 1120px.
- **Preview fidelity:** `PagePreviewViewport` is a plain document viewport with a thin border, no device chrome and natural height capped by a scroller. It fits a 390px public layout to its observed screen width; do not scale its toolbar or add synthetic scroll parallax. Public inline responsive content uses the `.ld-page` container rather than the admin viewport. Sample blocks are only for an empty inventory; disabling or feature-hiding saved blocks must show the real empty page. Mobile retains mode controls and sample/draft explanations. Settings, social and vCard invalidations refresh the shared public query while preserving unsaved overrides.
- **Public page layout:** `page_layout` selects `split` (default: sticky profile left, full-width block stack right from 896px) or `stacked` (profile above blocks). Narrow pages always stack. Legacy header layout values remain accepted for saved-data compatibility; every section now renders a vertical list. The shared renderer applies this to live pages, static builds and the admin preview.
- **Stylesheet sources:** `src/index.css` explicitly scans the web component tree and `packages/ui/src`; keep static/CLI/development builds on those roots so generated caches and disposable app copies cannot supply class candidates. If the installed Turbopack reports an internal aggregation panic, stop only the owned dev process and preserve its `.next/dev` cache outside the checkout before a fresh start; verify the real page and reload, not just the startup banner.
- **Public contract and fonts:** `resolvePublicPageSettings` in `@linkden/validators/public-settings` maps the same allowlisted scalar settings for API and static rendering. Keep secrets outside that projection. `src/public-fonts.css` and checked-in, licensed `public/fonts` files supply Sora/DM Sans to both renderers; the static builder copies and hashes fonts and licenses. Do not reintroduce a Next-only public-font definition.
- **Admin presentation:** neutral gray/charcoal surfaces and restrained blue accents, with Montserrat/Roboto. Standard controls are 36px on desktop, compact controls 32px, and touch controls at least 44px. Section titles use 16px, body/subsections 14px and helpers 12px. `CardTitle` owns a native `h2` (or `as="h3"` for subsections); do not wrap it in another heading. The shared class merger registers the custom `--text-*` names so font sizes do not collide with text colors.
- **Shared footer:** `components/admin/admin-footer.tsx` owns admin branding, version/development metadata and theme controls. Branding respects `admin_branding_enabled`; account menus contain identity and account actions. `SidebarInset` is a structural `div`; the shell renders one `main` and a separate footer. Public theme fonts/radii/control fallbacks remain scoped independently. Admin charts and sections avoid decorative entrance effects; actual loading indicators remain.
- **Publication status** (`state-pill.tsx`): the existing header control opens an explicit Publish action and a draft-block review link. Unsaved state comes from `useAnyUnsaved()`; Published requires a verified publication receipt, never a successful save. Publishing stays off until the protected API has an approved target and runner. Only successful public-source saves invalidate status; pending-job polling is bounded, with manual refresh after its window. Keep every form on `useUnsavedChanges` so the control and navigation guard stay honest.
- **Block drafts:** the block toolbar's `Apply n new` calls the existing `blocks.publishAll` status update. `No block drafts` means only that all blocks are applied. Legacy public reads include enabled, applied blocks immediately; static public revisions still require the header's separate Publish action and verified receipt. Keep applying content distinct from deploying it in labels, toasts, and previews.
- **Unsaved guard:** one module-level guard (beforeunload, capture click, Navigation API `traverse` for Back/Forward) shared by every `useUnsavedChanges`, so the user is prompted once. `unsavedEditSnapshot()` exposes the current edit for `ImageUploadField`.
- Cards use matte `bg-card border-border shadow-surface` surfaces without blur. Navigation uses restrained solid state fills; `SectionRule` and public profile dividers use the signal gradient. The Unsaved control uses a warning outline and text without a glow or animated dot.
- Motion: preview collapse uses a 220ms width transition. Keep decorative entrance effects off admin forms and charts. The global `prefers-reduced-motion` rule shortens transitions and explicitly disables public entrance classes. JS motion checks itself: imperative smooth scrolls use `prefersReducedMotion()` from `hooks/use-reduced-motion.ts`.
- AdminShell sets `scroll-padding-top/bottom` on `<html>` while mounted (WCAG 2.4.11). The sidebar shortcut is Cmd+B (Apple) / Ctrl+B, ignored in editable fields and below md.
- Wrap sections in `Card` / `CardContent`
- Section headers: use the shared 16px `CardTitle`; choose `as="h3"` for a subsection.
- Settings forms: `useSettingsForm` scope per page + one `StickySaveBar` (sits above the bottom tab bar below lg). It saves only keys that differ from the saved baseline (still one `updateBulk`/`runBatch`), keeps unsaved edits across a refetch, and exposes `isError`/`error`/`refetch` for a `QueryError` retry state.
- Setup wizard: `/admin/setup` - 4-step centered-card onboarding (Account → Profile → Theme → Done); `/` 307s here (`app/page.tsx`, when `getPage` has no profile) and `/admin/login` sends here while no admin exists (WordPress-style, no setup token); redirects to `/admin/login` if account already exists; `?test=true` prefill is dev-only.
- Login page: `/admin/login` - compact centered form using normal site branding and semantic theme tokens; reset-password uses the same direction. Dedicated login logo/background controls are removed. Existing `branding_login_*` records remain for backup compatibility and are not cleared by preference saves. After password sign-in it shows a TOTP / backup-code step when Better Auth answers `twoFactorRedirect` (optional "trust this device for 30 days"). Honours `?from=` after every sign-in method, validated by `safeAdminRedirect` (`app/admin/login/redirect.ts`: plain `/admin` paths only, never login/setup/reset-password).
- Design → Theme: `custom_primary/secondary/accent/background` are true overrides — empty inherits the preset in light and dark; picking a preset clears them (`app/admin/design/theme-form.ts`).

### Settings Key Groups
All settings stored as key-value in `site_settings` table. Per-key metadata (whitelist, sanitizer kind, max length, secret/mask, backup policy) is centralized in `packages/validators/src/settings-registry.ts` — the settings/wallet/vcard/backup routers all derive from it. Add new keys there, not in ad-hoc lists.
- **Profile:** `profile_name`, `bio`, `avatar_url`, `verified_badge`
- **Appearance:** `page_layout`, `theme_preset`, `theme`, `custom_primary/secondary/accent/background`, `custom_css`, `banner_*`, `social_icon_shape`
- **SEO:** `seo_title` (max 100), `seo_description` (max 250), `seo_og_image`, `seo_og_mode`, `seo_og_template`, `site_language`
- **Branding:** `branding_enabled`, `branding_text`, `branding_link`, `branding_logo_url`, `branding_favicon_url`, `branding_site_name`, `branding_pp_url`, `branding_tos_url`, `admin_branding_enabled`
- **Features:** `wallet_pass_enabled`, `vcard_enabled`, `vcard_data`, `contact_form_enabled`, `mapkit_enabled`, `mapkit_token`
- **Auth/CAPTCHA:** `magic_link_enabled` (can't be turned on without email or while 2FA is on; the settings router rejects it too), `captcha_provider`, `captcha_site_key`, `captcha_secret_key`
- **Email:** `email_provider` (unset = Resend; other providers never send), `email_api_key`, `email_from`, `contact_delivery` (`database` / `email` / `both`; a failed or unconfigured email send falls back to the Inbox and is audited as `contact.email_failed`)
- **System:** `default_color_mode`, `timezone` (historical analytics API day buckets; unset = UTC; Inbox timestamps use the same preference), `consent_banner_enabled`, `consent_banner_text`, `consent_categories`

### Explicit static publication

- `publication.request/status` are protected tRPC procedures. The default disabled status does not query publication tables, so existing local databases can still run the editor. Opt-in configuration and GitHub dispatch live in `utils/publication-dispatch.ts`; credentials never enter browser settings or snapshots.
- Immutable public snapshots, compiler validation and canonical artifact receipts live in `@linkden/validators/publication`. `createPublicationSnapshot` resolves origin-relative upload paths (profile image, URL-kind settings, image `src`, link `thumbnail`) against the snapshot's public origin, so frozen snapshots only hold absolute URLs. Scheduled releases use a separate immutable private approved source; future content must never enter public artifacts, status responses or the CI build input. Boundary jobs must not reread mutable authoring rows.
- `apps/public/build.ts` reuses the actual public components, local fonts and shared OG templates. Approved image keys are read individually and rewritten to hashed assets; no bucket listing or arbitrary media fetch. The OG child denies network fetch and preconnect. Unresolved local media, external HTTP media and custom CSS dependencies block the CI runner.
- `apps/public/publish.ts` claims a frozen revision, verifies every local file, stages an immutable version, checks the current approval/head, activates, verifies exact HTTP assets/404/security headers, then commits its receipt. Verification is bounded. Failure restores and verifies the last good version; ambiguous activation/completion latches recovery instead of inventing live status.
- `apps/public/stage.ts` generates native assets-only Wrangler configuration with no entrypoint, bindings, routes or Worker-first fallback. `cloudflare.ts` requires an owned, bootstrapped target with closed preview aliases before activation. CI publication is serialized per target, requires owner opt-in and the exact approved main commit with successful CI, and retains public artifacts for 30 days. The workflow and Cloudflare/D1 adapters require an approved cloud integration test before claiming deployment readiness.
- Interrupted jobs never transfer runner ownership automatically. After confirming the previous workflow has stopped, an operator can explicitly dispatch `Publish public revision` with `operation=recover` and the interrupted revision/digest. Recovery fences requests, restores and HTTP-verifies the matching last-good immutable version, then clears only its unchanged fence. A missing last-good receipt or uncertain database acknowledgement leaves recovery required; the action never creates a replacement from mutable authoring data.
- `apps/public` has its own typecheck in the workspace. `@types/bun` is pinned to the repository's declared Bun version; runtime, local HTTP and cloud verification remain separate checks. Source migrations are not permission to apply them to an existing database.

- Public runtime boundary: `components/public/public-runtime.tsx` injects contact submission, vCard downloads and editor-only unresolved icon rendering. Existing Next Providers supplies the current tRPC transport; `static-client.tsx` uses credential-free `/api/contact` and generated `.vcf` files, with no auth/session/profile-refetch transport. Static builder entry: `bun run build:public <input.json> <out> [https://api.example.com/api/contact]`.
- Dedicated `POST /api/contact`: explicit `PUBLIC_SITE_URL` sets the allowed profile Origin, independently of the action hostname in `PUBLIC_CONTACT_URL`. It rejects Cookie/Authorization and requires CAPTCHA matching the profile origin, a 64 KiB body cap and RL_AUTH. All delivery paths share 100 atomic reservations per UTC day (`contact_quota` singleton); failed delivery does not restore reservations. Split deployment binds the validated optional action and profile origin; without an action URL the API has no public route. Configure the public publisher's `PUBLICATION_CONTACT_ACTION` to that same action URL. These are source controls; no public ingress or routing has been deployed or verified in Cloudflare.

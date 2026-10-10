# Changelog

All notable changes to LinkDen. Each release has two sections:

- **✨ What's new** — plain-language summary for site owners.
- **🔧 Technical** — internal changes, refactors, security details for
  developers and self-hosters.

Format: [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
Versioning: [Semantic Versioning](https://semver.org/spec/v2.0.0.html).
Canonical version: [`version.json`](./version.json) — workspace
`package.json` files mirror it.

## [Unreleased]

### ✨ What's new

- **Two-factor sign-in works.** Turn on an authenticator app under
  Settings → Account and save your backup codes. After your password,
  the login page now asks for the 6-digit code (or a backup code), with
  an optional "trust this device for 30 days". Before, turning 2FA on
  could lock you out of your own admin. Lost your phone and your codes?
  `bun reset:password -- --email you@example.com --disable-2fa`.
- **CAPTCHA actually shows up.** Cloudflare Turnstile, Google reCAPTCHA
  (v2 checkbox) or hCaptcha now renders on the public contact form and
  is checked on the server. Site and secret keys are both required once
  a provider is picked.
- **A rebuilt admin console.** Five places instead of eight: Links,
  Design, Insights, Inbox and Settings, with a sidebar, a live phone
  preview on every editing page, and an honest status pill (Unsaved /
  n unpublished / Live). Every page has its own browser-tab title, and
  old admin links redirect to their new home.
- **New blocks and a desktop layout.** Image, text and divider blocks;
  link cards in button, thumbnail or featured-image style; headers that
  lay out the blocks below them as a list, grid or carousel. On wide
  screens your profile sits in a sticky column beside your blocks. A
  share button (with QR code) sits on the page, and the page and admin
  can be installed as apps.
- **Editing a live block keeps it live.** Renaming, dragging or hiding a
  published block no longer pulls it off your page until you click
  Publish. Publish now only promotes brand-new blocks ("Publish 3 new").
- **Destructive actions ask first.** Deleting a block, importing a
  backup and applying a wallet template preset all confirm before
  anything changes, and Undo puts a deleted block back in its old spot.
- **Apple Wallet passes are now downloaded by you, not your visitors.**
  The public "Add to Wallet" button and `/api/wallet-pass` are gone.
  Download the signed pass from Settings → Wallet ("Downloads enabled")
  and share it however you like.
- **Wallet signing keys are easier to get right.** Upload your `.pem`
  or `.cer` files (or paste PEM) and they are checked before saving.
  "Ready" now means the keys can really sign a pass, and each saved key
  can be cleared to fall back to the environment value.
- **The footer "Save vCard" button works without a vCard block.** It
  downloads the contact card from Design → Branding.
- **Contact forms that disappeared after an upgrade are back.** Old
  `form` / `contact_form` blocks are converted to Connect blocks.
- **Your visitors are never told a saved message failed.** If the email
  notification fails (or email isn't set up), the message is kept in
  your Inbox and the failure is logged. Contact-form delivery
  (Inbox, email or both) can now be chosen under Settings → Email.
- **Cookie consent visitors can change.** A footer "Cookie settings"
  link reopens the banner, a choice expires after 12 months, Accept and
  Reject look equally prominent, and embedded media (YouTube, Spotify,
  SoundCloud, custom) waits for a click while the banner is on. A first
  visit is still counted once the visitor accepts analytics. If you turn
  the banner off, analytics run for every visitor without asking.
- **Less data about visitors.** Browser user-agent strings are no longer
  stored, referrers are kept as a bare hostname, and "Where did we
  meet?" is only asked when you switch it on for a form.
- **Inbox upgrades.** Older messages load page by page ("Showing n of
  total"), a Select mode marks read or deletes in bulk, opening a
  message marks it read once (Mark unread sticks), timestamps follow the
  timezone in Settings → Account, and reply links can't be hijacked by a
  crafted email address.
- **Insights in your timezone.** Daily views and clicks follow your
  timezone setting, every day of the period shows (zeros included),
  dates no longer show a day early west of UTC, "All time" no longer
  claims +100%, the Clicks line is dashed, and the chart has a
  screen-reader table.
- **Paste a social profile link.** Social rows accept a full profile URL
  or an `@handle` and store a clean link (no more
  `https://x.com/https://x.com/ada`).
- **Custom theme colours work in dark mode too.** Leaving a colour empty
  now means "use the preset" in both light and dark, and picking a
  preset clears your overrides. Colours you saved before stay pinned
  until you clear them.
- **Sign-in is harder to abuse.** Resetting your password signs out
  every device, changing your email needs a link from the old address
  and then the new one, magic links can't be turned on without email or
  while 2FA is on, and login sends you back to the page you came from.
- **`bun reset:password` no longer locks you out**, works against
  production, and never takes the password on the command line.
  Production deploys refuse unsafe auth settings.
- **Claim your install safely.** Set the optional `SETUP_TOKEN` secret
  and only someone who knows it can create the admin account on a fresh
  public deploy.
- **Image fixes.** Discarding an image change no longer breaks the saved
  image, crops upload on Safari/iOS, pinch-zoom no longer tilts a crop,
  and Enter on the crop dialog's buttons does what the button says.
- **Accessibility and polish.** Form fields, checkboxes and off switches
  have visible outlines; keyboard focus shows in the account menu and
  segmented toggles; light-mode success/warning badges pass AA; the
  Grain Dark banner shows its grain; Corporate Classic dark mode uses a
  readable lighter blue; shader banners freeze under reduced motion and
  have a pause button; the sidebar remembers if it was collapsed; browser
  Back asks before discarding unsaved edits; reverted edits no longer
  show "Unsaved"; "Show preview" keeps your block edits; the Admin panel
  branding switch works; a "system" colour mode renders in the visitor's
  OS theme without a flash on Chromium.

### 🔧 Technical

#### Added

- Better Auth `twoFactor` plugin (issuer "LinkDen") with the `two_factor`
  table (encrypted secret + backup codes, FK → `user` ON DELETE CASCADE).
  Migration `0008_two_factor` adds it and drops the unused
  `user.two_factor_secret` / `two_factor_backup_codes` columns.
  `two_factor_enabled` turns on only after the first TOTP code verifies.
- Migration `0009_auth_and_block_data_fixes` (data only): backfills
  `user.email_verified = 1` and converts `form` / `contact_form` blocks to
  `connect`. Migration `0010_drop_social_icons_blocks` removes retired
  `social_icons` block rows.
- `createAuthOptions(deps)` in `packages/auth/src/auth-options.ts`: the
  env-free Better Auth factory; `index.ts` only wires env, D1, Resend and
  secret validation, and tests build instances from the same factory.
- Optional `SETUP_TOKEN` secret (`apps/server/src/lib/setup-token.ts`):
  when bound, the first signup must send a matching `x-setup-token`
  header (constant-time compare) or gets 403 `Invalid setup token`.
  Bound by Alchemy only when set; wired into `deploy.yml`, `turbo.json`
  and `.env.example`.
- `RL_SIGNIN` rate limit (30/60s, namespace 1006 prod / 2006 non-prod)
  with constant keys `global:sign-in` / `global:two-factor` /
  `global:password-reset`, so the single admin can't be brute-forced by
  rotating addresses.
- `components/public/captcha-widget.tsx` (Turnstile, reCAPTCHA v2,
  hCaptcha) sending `captchaToken` with action `contact`; `getPage`
  exposes `captchaProvider` + `captchaSiteKey` only.
- `forms.count({ isRead?, blockId? })`; `forms.list` takes
  `limit`/`offset`. `submitContact` gains a `website` honeypot and an
  optional `whereMet`; `trackView` / `trackClick` take an optional
  `referrer`. `version.checkUpdate` takes `{ force?: boolean }`.
- `resolvePublicVcard()` (`packages/api/src/routers/vcard.ts`): single
  source for `GET /api/vcard` (`?block=<id>`, else the first live vCard
  block, else `vcard_data`).
- Settings registry: opaque keys can declare `validate` (vcard_data,
  consent_categories, wallet field/location JSON, relevant date, signing
  material); new `site_language` key (Design → SEO) drives `<html lang>`.
- `@linkden/validators/consent`, `MAX_BLOCKS = 500`
  (`@linkden/validators/blocks`), `@linkden/db/settings-read`
  (`readSettings`, `AnySqliteDb`).
- Backup export adds top-level `notes` and an `images` list of
  referenced keys (images themselves are still not in backups).
- Web: `lib/admin-routes.ts`, `lib/theme-colors.ts`, `lib/custom-css.ts`,
  `lib/contact-form.ts`, `lib/block-icons.ts`;
  `components/admin/analytics/daily-series.ts` + `admin-time-zone.ts`;
  `components/admin/social/social-url.ts`;
  `components/admin/connections/mailto.ts`; `SecretInput`;
  `mutationErrorMessage`; `--input-border` token
  (`border-input-border`); `unsavedEditSnapshot()`;
  `prefersReducedMotion()` / `useReducedMotion()`.
- `.github/workflows/release.yml`: a `version.json` change on `main`
  tags `vX.Y.Z` and publishes a GitHub release, so
  `version.checkUpdate` has something to compare against.
- Deploy: preflight step naming missing secrets/vars, a D1 Time Travel
  restore-point bookmark in every job summary, and a web smoke probe.
- Tests: Worker-entry route tests (`apps/server/src/__tests__/routes.test.ts`),
  router integration tests in `packages/api/src/routers/__tests__/`, and
  per-glob coverage floors for routers, the tRPC middleware,
  auth-options/dev-login, `apps/web` `proxy.ts` + `lib/**`,
  `packages/infra/deploy-config.ts` and `scripts/lib/reset-sql.ts`.
  `PW_API_URL` overrides the API origin for the e2e `getPage` check.

#### Changed

- **Rate limits apply per tRPC call.** A Hono `/trpc/*` middleware parses
  the batch like tRPC does and spends one token per `submitContact`
  (RL_AUTH) / `trackView` / `trackClick` (RL_PUBLIC) call; batches are
  capped at 20 (`maxBatchSize`) and oversize or undecodable batches get
  400. Limiter keys are the client IP with IPv6 collapsed to its /64.
  `/api/auth/two-factor/*` is limited (RL_AUTH + RL_SIGNIN) and the
  magic-link send path gets RL_STRICT. The server calls
  `RateLimit.limit()` directly (`@hono-rate-limiter/cloudflare` is no
  longer imported).
- Better Auth's built-in limiter is explicitly enabled
  (`rateLimit: { enabled: true }`, in-memory per isolate; it was always
  off on Workers because `NODE_ENV` is never "production"): 3/10s for
  sign-in, change-email, change-password and `/two-factor/*`, 5/60s for
  magic link.
- Request logging: `hono/logger` replaced by a path-only line
  (`METHOD path status ms`, reset-password token redacted). `logError`
  (`apps/server/src/lib/log.ts`) strips Drizzle bound params. Workers
  invocation logs are off. `/api/health` logs the D1 error when degraded.
- Retention cron also prunes expired `verification` rows (reset,
  magic-link, 2FA challenge, trusted device) in the same batch, logs each
  failed step (path `scheduled`, step `prune` | `orphan-sweep`) and
  rejects with an `AggregateError`. Orphan deletes are batched per listed
  page and counted only when R2 confirms them.
- Uploads: `replaces` is honoured only for a same-purpose key that no
  saved setting or block references. `ImageUploadField` sends it only for
  an upload made during the current unsaved edit; saved-then-replaced
  objects go to the daily orphan sweep (24h grace).
- `GET /api/images/*` 404s key shapes the app never writes without an R2
  read, sends an `ETag`, and edge-caches via `caches.default` (cache key
  without the query string).
- `requestMeta` returns only `{ ip, country }`; analytics `user_agent` is
  written NULL (`truncateUserAgent` removed) and the Referer header is no
  longer read. The client `referrer` is stored as its lowercased hostname
  and dropped for the site's own host.
- `verifyCaptcha`: empty secret = misconfigured; hostname must equal the
  `CORS_ORIGIN` hostname whenever it is set (fails closed if
  unparseable); Turnstile always needs action `contact`; reCAPTCHA v3
  needs action `contact` and score ≥ 0.5.
- tRPC: `isDev` pinned false; an `errorFormatter` strips `data.stack` and
  replaces INTERNAL_SERVER_ERROR messages with "Internal server error".
- Magic link: single admin only, refused while 2FA is on,
  `disableSignUp`, 10-minute links, enabled-gate in a Better Auth
  before-hook (403 before a token is stored); the server gate covers both
  `/api/auth/sign-in/magic-link` and `/api/auth/magic-link/*` and needs
  `magic_link_enabled` to be exactly `"true"`.
- Change email is two-step and returns 400 "Email delivery is not
  configured…" without a Resend key. Password reset sets
  `revokeSessionsOnPasswordReset`. The admin is created with
  `emailVerified = true`.
- `BETTER_AUTH_SECRET` fails closed: empty, or under 32 characters / a
  placeholder on any non-loopback `BETTER_AUTH_URL`, means auth is never
  built; `/api/auth/*`, `/trpc/*`, `/api/upload` and `/api/admin/*`
  answer 503 and `/api/health` reports `auth: "misconfigured"`.
- `DEV_LOGIN` needs `DEV_LOGIN="true"` plus a plain-http loopback
  `BETTER_AUTH_URL`, and the endpoint 404s for a non-loopback Host.
- `alchemy.run.ts` validates the deploy env before touching state
  (`deployEnvErrors`); `LINKDEN_DB_NAME` / `LINKDEN_IMAGES_BUCKET` apply
  to the prod stage only; prod D1/R2 use `delete: false` and a prod
  destroy needs `LINKDEN_CONFIRM_DESTROY_PROD=yes`; the Workers
  compatibility date is pinned (2026-04-24); `apps/*/.env` load only for
  `bun dev`. `deploy.yml` deploys only `push` runs from this repo's
  `main` and never cancels a running deploy.
- `backup-db.yml` honours `LINKDEN_DB_NAME` and refuses to upload a dump
  with no `user` row. CI runs Vitest once (`test:coverage`).
- `bun reset:password` uses Better Auth's scrypt hash, reads the password
  from a prompt / stdin / `LINKDEN_RESET_PASSWORD`, signs every session
  out, fails when no account matches, and supports `--remote`,
  `--db` and `--disable-2fa`. `bun reset:factory` is one atomic batch over
  every data table and asks you to type the DB name for `--remote`.
  `bun db:reset` wipes both local dev stores.
- `drizzle.config.ts`: `db:generate` needs no credentials; the `db:push`
  script is gone (push bypasses the migration ledger and the 0007
  trigger).
- `backup.import` replace mode keeps secret settings, upserts blocks in
  place (deleting ids missing from the backup, so click history of
  restored blocks survives) and never wipes the contact table (only
  messages absent from the backup are deleted; the newest 500 backup
  messages are upserted). Import accepts what export emits (ISO dates;
  epoch ms still accepted), maps retired block types, skips secret keys
  and counts them; the response adds `skipped.contactSubmissions`. Caps:
  500 blocks, 500 settings, 5000 contacts on the wire / 500 written.
- Wallet: `updateSigningKeys` normalizes base64-wrapped PEM to raw PEM,
  keeps base64 DER certs and rejects unloadable material (EC keys,
  PKCS#12, garbage) with BAD_REQUEST; `getSigningStatus` booleans mean
  "configured and loadable"; the `.pkpass` route caps field sections with
  `PASS_FIELD_LIMITS`; a wrong `WALLET_SIGNER_KEY_PASSPHRASE` fails with
  "Unable to load wallet signer key (wrong passphrase?)". Empty pass-field
  keys are rejected with the section and field number.
- vCard output is RFC 6350 escaped (no CR/LF injection), always has an
  `N` line, puts department in `ORG` and reduces URL `TYPE` to a token.
- Blocks: the server assigns positions (append at `MAX(position)+1`;
  Undo re-inserts at its old slot in one batch); lists order by
  `(position, createdAt, id)`. `stripHtml` strips only real tags and no
  longer decodes entities (`<jane@corp.com>` and `x < 5` stay verbatim).
- `danger.resetEverything` derives its table list from every table in
  `@linkden/db/schema`, so new tables (like `two_factor`) are wiped too.
- `getPage` is one D1 batch reading only `PUBLIC_PAGE_SETTING_KEYS`,
  honours privacy/terms URL vs text mode and falls the consent banner's
  privacy link back to `branding_pp_url`. Insights day buckets use the
  admin timezone's current UTC offset. Timezone validation uses
  `Intl.DateTimeFormat` (UTC, Asia/Kolkata, Europe/Kyiv accepted).
- `version.checkUpdate` is admin-only with a 5s timeout and a
  per-isolate cache (6h ok / 10min failure; `force` reuses an answer under 60s old;
  concurrent misses share one request), returning `status: 'ok' |
  'unavailable'` plus `reason`.
- Web: root layout metadata is static (profile/SEO/OG/favicon metadata
  moved to `app/page.tsx`); block icons resolved server-side;
  `AdminBadge` loads only with a session cookie; an API outage on `/`
  renders `app/error.tsx` with HTTP 500; the service worker is
  `/sw.js?v=<version>` with cache `linkden-v4-<version>`, navigation
  preload and 2xx-only caching; `/og` runs on Node with the Workers Cache
  API (anonymous requests always render the stored profile); the CSP
  (`contentSecurityPolicy()`) allows the CAPTCHA providers; `/` sends
  `Accept-CH` / `Critical-CH: Sec-CH-Prefers-Color-Scheme`.
- Admin: `useSettingsForm` saves only changed keys and keeps unsaved
  edits across refetches; one module-level unsaved guard (beforeunload,
  capture click, Navigation API `traverse`); `PreviewColumn` keeps the
  block editor mounted while collapsed; every admin route has a server
  `layout.tsx` title; login honours `?from=` via `safeAdminRedirect`.
- `@linkden/env/web` no longer uses t3-env or zod (same import path and
  shape, still validates at import/build time; `SKIP_ENV_VALIDATION`
  honoured).
- Email: `ContactNotificationProps` has `whereMet` and `blockTitle` in
  place of `subject` (phone and company removed); the footer links to
  the GitHub repo; Resend sends time out after 10s and throw
  `Failed to send email (<status>): <message>` without the API key. An
  unset `email_provider` means Resend; other providers never send.
- UI: `Alert` no longer defaults to `role="alert"`; the sidebar shortcut
  is Cmd+B / Ctrl+B (ignored in editable fields, disabled below md);
  `SidebarMenuButton` sets `aria-current="page"`; Switch/Checkbox disabled
  styles key off `data-disabled`. Security upgrade: next 16.3.8,
  OpenNext 1.20.9, hono 4.13.13.
- Admin console rebuilt on shadcn/Base UI with five destinations and
  path-segment sub-tabs; legacy routes 307 from `proxy.ts`.

#### Removed

- Public `GET /api/wallet-pass` and the footer wallet button (download is
  now `GET /api/admin/wallet-pass`, session-gated).
- tRPC procedures `public.getVCard`, `public.getBranding`,
  `analytics.recentClicks`, `analytics.purgeExpiredData`, `blocks.get`,
  `forms.get`, `version.current`, `wallet.applyPreset`. Analytics inputs
  accept only `{ period: 7d | 30d | 90d | all }`.
- `.github/workflows/check-social-icons.yml` and its script/data.
- `.p12` uploads for wallet signing keys.

#### Fixed

- Contact forms missing from public pages after upgrading (legacy
  `form` / `contact_form` rows).
- The footer vCard download 404ed when the page had no vCard block.
- `bun reset:password` wrote a hash Better Auth could not verify and only
  touched one local store; `bun reset:factory` reported success after
  failing and was not atomic.
- Enabling 2FA locked the admin out (no login step); the first magic-link
  sign-in could delete the admin's password (unverified email).
- Theme overrides only applied in light mode; Insights trends showed
  `+100%` for "All time" and dates shifted west of UTC.
- Social URLs doubled their prefix when a profile URL was pasted.

#### Security

- Same-origin writes: POSTs to `/trpc/*` and `/api/upload` must come from
  `CORS_ORIGIN` (normalized) or the request's own origin, with a
  `Sec-Fetch-Site` fallback, else 403. Body limits: 64KB on
  `/api/auth/*`, 1MB on `/trpc/*`, 16MB for `backup.*`. CORS
  `allowHeaders` include `x-setup-token`.
- Auth tokens never reach logs (path-only request line, invocation logs
  off); visitor PII is stripped from logged SQL errors.
- Inbox `mailto:` links are percent-encoded so a stored contact email
  can't add Bcc/Subject headers.
- tRPC error responses no longer carry stacks or internal messages.

## [0.5.0] — 2026-08-21

### ✨ What's new

- **LinkDen deploys for real now.** The production deploy pipeline works
  end to end on Cloudflare. Your site and its API live on one hostname
  (for example `https://links.yourdomain.com` with the API under
  `/api/*`), so there is no cross-site cookie juggling and admin login
  no longer bounces you back to the login page.
- **Custom domain in one setting.** Set `SITE_DOMAIN` and redeploy.
  LinkDen attaches the domain to the web app and routes the API under
  it. No dashboard clicking, no manual DNS records.
- **Daily database backups.** A scheduled job exports the D1 database
  every day into a private R2 bucket (`linkden-backups`), kept for
  30 days. Restore steps are in the troubleshooting docs.
- **You will know when email is not set up.** The dashboard shows a
  banner when no email API key is configured (password reset and magic
  links need it) with a direct link to the Email settings tab.
- **Wallet pass editor, iOS style.** The Apple Wallet builder now looks
  and works like the Wallet app: a centered pass preview with a bottom
  tab bar (Business, Images, Context, Colors, Background), live AA
  contrast badges on custom colours, and an "Unsaved" chip so you never
  lose an edit.
- **Better keyboard and screen-reader support.** Bottom sheets (mobile
  preview, block editor, connections detail) trap focus, close on
  Escape, and restore focus when dismissed. Every admin page has one
  real heading. Colour fields warn you when text will be hard to read
  and offer a one-tap fix.
- **Theme preset names.** "Light" is now "Classic" and "Dark" is
  "Graphite". Your saved choice is unchanged.
- **Contact form delivery works.** Email, database, and "both" delivery
  modes now do what they say. Submissions are stored before the email
  goes out, so a mail failure never loses a message.
- **Password reset works.** The reset link on the login page now calls
  the right endpoint.
- **Faster admin sessions.** Session lookups for page loads are cached
  in the cookie for one minute, so admin pages stop hitting the database
  on every request. Anything that changes data still checks the database,
  and changing your password now signs out every other browser.

### 🔧 Technical

#### Added

- Same-origin routing model in `packages/infra/alchemy.run.ts`: the web
  worker (`linkden`) owns `SITE_DOMAIN` as a Cloudflare Custom Domain;
  the API worker (`linkden-api`) gets Routes `SITE_DOMAIN/api/*` and
  `SITE_DOMAIN/trpc/*`. Routes run before the custom-domain worker, so
  `BETTER_AUTH_URL`, `NEXT_PUBLIC_SERVER_URL`, `CORS_ORIGIN`, and
  `NEXT_PUBLIC_SITE_URL` are all `https://SITE_DOMAIN` in production.
  Unset `SITE_DOMAIN` deploys to `workers.dev` (staging).
- Service binding `API` from the web worker to the API worker. SSR
  fetches go through `apps/web/src/lib/server-api.ts` (`apiFetch`),
  because a worker `fetch()` to its own zone bypasses routes. Falls back
  to `NEXT_PUBLIC_SERVER_URL` in local dev.
- `NEXT_PUBLIC_SITE_URL` (validated with `z.url()` in
  `packages/env/src/web.ts`) drives `metadataBase`, `robots.ts`, and
  `sitemap.ts`. The `example.com` fallbacks are gone; the `localhost`
  default only applies outside production builds, and `alchemy.run.ts`
  fails the deploy when the variable is empty or does not match
  `https://SITE_DOMAIN`.
- Explicit Alchemy stage (`ALCHEMY_STAGE`, default `prod`) and resource
  names: `linkden-db`, `linkden-images`, `linkden`, `linkden-api`,
  `linkden-backups` (R2, 30-day lifecycle expiry). Non-`prod` stages get
  the stage as a name suffix so a `dev` deploy is independent of
  production. **Upgrade note:** installs deployed before this release have
  Alchemy-generated names (`linkden-database-runner`,
  `linkden-images-runner` from CI); set `LINKDEN_DB_NAME` and
  `LINKDEN_IMAGES_BUCKET` to those before deploying or the `prod` stage
  creates an empty database and bucket. See the Cloudflare self-hosting
  guide.
- `.github/workflows/backup-db.yml`: daily `wrangler d1 export` to
  `linkden-backups/d1/<date>.sql`.
- Structured JSON error logs: Hono `app.onError`, tRPC `onError`, and a
  `try/catch` around `scheduled()` in `apps/server/src/index.ts`.
  Worker invocation logs enabled via `observability`.
- `/api/health` reports `email: configured | missing` next to
  `database` and `version`.
- Dashboard email-missing banner linking to `/admin/settings?tab=email`
  (the settings page now reads `?tab`).
- Tests: `apps/server/src/__tests__/health.test.ts`,
  `apps/web/src/app/__tests__/sitemap.test.ts`,
  `packages/auth/src/__tests__/cookie-config.test.ts` (Secure, HttpOnly,
  SameSite=Lax, no `Domain=`).
- Shared `Sheet` primitive (Base UI Dialog) with a `breakpoint` prop
  that auto-closes past its breakpoint; replaces three hand-rolled
  bottom sheets ([#51](https://github.com/MrDemonWolf/linkden/pull/51)).
- `ColorField` `contrastAgainst` prop: live WCAG ratio badge and a
  "Fix" chip backed by `getReadableTextColor`; wired into appearance
  custom colours and block custom bg/text colours ([#51](https://github.com/MrDemonWolf/linkden/pull/51)).
- `Tabs variant="bar"` (icon over label, roving tabindex) for the iOS
  style wallet editor ([#52](https://github.com/MrDemonWolf/linkden/pull/52)).
- `@linkden/db/testing` in-memory libsql helper (`createTestDb`) for
  integration tests; `settings-registry.ts` drift test; CAPTCHA,
  upload-signature, retention, embed-registry, and batch-rollback tests
  ([#53](https://github.com/MrDemonWolf/linkden/pull/53)).
- Daily retention cron (`scheduled()` handler) pruning analytics,
  sessions, contacts, and audit rows, plus an orphan R2 image sweep with
  a 24h grace window ([#53](https://github.com/MrDemonWolf/linkden/pull/53)).
- Contact form delivery (`email` / `database` / `both`) through
  `packages/email` ([#53](https://github.com/MrDemonWolf/linkden/pull/53)).
- CI security job: OSV scanner plus a CycloneDX SBOM artifact
  ([#53](https://github.com/MrDemonWolf/linkden/pull/53)). The scan is
  report-only for now (open advisories are all dev-tooling transitives);
  `osv-scanner.toml` is in place for dated ignores once it is switched to
  blocking. `next` bumped to 16.2.11 and `hono` to 4.13.3.

#### Changed

- `apps/web/src/app/api/og/route.tsx` moved to `app/og/route.tsx` so the
  OG image route no longer collides with the `/api/*` Worker route.
  `layout.tsx` and the SEO settings section point at `/og`.
- Better Auth `session.cookieCache` enabled (`maxAge: 60`, options in
  `packages/auth/src/auth-options.ts`, shared with the cookie test).
  `createContext` and `/api/upload` pass `disableCookieCache` for non-GET
  requests, so mutations always read the session table and a factory
  reset or revoke takes effect immediately; GET reads may lag by up to
  60 s. `changePassword` sends `revokeOtherSessions: true`. Stale
  cross-subdomain cookie comments removed from `packages/auth/src/index.ts`.
- Deploy workflow: Node version pinned via `.node-version` (`24`),
  `setup-node` SHA-pinned, `SITE_DOMAIN` and `NEXT_PUBLIC_SITE_URL` read
  from environment variables, both added to `turbo.json`
  `passThroughEnv`. Docs deploy builds with
  `NEXT_PUBLIC_BASE_PATH=/linkden`.
- Alchemy state moved from the deprecated `D1StateStore` to the shared
  `alchemy-state` `CloudflareStateStore` worker; `ALCHEMY_STATE_TOKEN` is
  now required at deploy time
  ([#54](https://github.com/MrDemonWolf/linkden/pull/54)).
- Alchemy runs under Node via `tsx` (Bun segfaults on the Alchemy
  program, exit 132). Deploy secrets declared in `turbo.json`
  `passThroughEnv` so Turborepo strict env mode passes them through
  ([#55](https://github.com/MrDemonWolf/linkden/pull/55)).
- Wallet editor rebuilt around a `DeviceFrame` preview hero with an
  in-flow translucent sheet; state model, tRPC contract, and `wallet_*`
  keys unchanged ([#52](https://github.com/MrDemonWolf/linkden/pull/52)).
- Dashboard and appearance headers render via `PageHeader`;
  `DesktopTopBar` label demoted to a non-heading kicker so each page has
  one `h1` ([#51](https://github.com/MrDemonWolf/linkden/pull/51)).
- Theme preset display labels: "Light" → "Classic", "Dark" → "Graphite"
  (persisted keys untouched) ([#51](https://github.com/MrDemonWolf/linkden/pull/51)).
- Settings metadata (sanitizer kind, max length, secret/mask, backup
  policy) consolidated into `packages/validators/src/settings-registry.ts`;
  settings, wallet, and backup routers derive from it
  ([#53](https://github.com/MrDemonWolf/linkden/pull/53)).
- Backup import, block reorder, bulk settings, wallet config, and danger
  resets run as a single `db.batch([...])`
  ([#53](https://github.com/MrDemonWolf/linkden/pull/53)).
- Version read from `version.json` only, compared with `compareSemver`
  ([#53](https://github.com/MrDemonWolf/linkden/pull/53)).
- Next 16 `middleware.ts` renamed to `proxy.ts`; tsdown `noExternal`
  replaced with `deps.alwaysBundle`; dead Wallet "coming soon" branch
  removed ([#53](https://github.com/MrDemonWolf/linkden/pull/53)).
- Shared email, wallet JSON parsing, and embed-provider helpers
  (`parsePass*Json`, one embed registry in validators)
  ([#53](https://github.com/MrDemonWolf/linkden/pull/53)).
- `check-types` scripts in every code workspace; `@vitest/coverage-v8`
  with a coverage floor enforced in `vitest.config.ts`
  ([#53](https://github.com/MrDemonWolf/linkden/pull/53)).

#### Removed

- Docker, Coolify, and Railway deployment path and docs. Deployment is
  Cloudflare-only ([#53](https://github.com/MrDemonWolf/linkden/pull/53)).
- `/qr` entry dropped from `sitemap.ts`.

#### Fixed

- Password reset on the login page called a nonexistent endpoint on the
  web origin; it now uses `authClient.requestPasswordReset` against the
  API ([#53](https://github.com/MrDemonWolf/linkden/pull/53)).
- Deploy workflow checks out `workflow_run.head_sha`, the exact commit
  that passed CI ([#53](https://github.com/MrDemonWolf/linkden/pull/53)).
- `settings.getAll` masked three of six secrets; wallet signing certs
  were returned in plaintext ([#53](https://github.com/MrDemonWolf/linkden/pull/53)).
- `audit_log` was skipped by full and factory resets
  ([#53](https://github.com/MrDemonWolf/linkden/pull/53)).
- Wallet "Unsaved changes" chip failed AA on the translucent panel;
  keyboard focus is kept when switching editor tabs
  ([#52](https://github.com/MrDemonWolf/linkden/pull/52)).
- Dashboard chrome used hardcoded blue/violet (about 2.5:1 on the day
  theme); consent banner "Accept Selected" and footer pills now read on
  light presets ([#51](https://github.com/MrDemonWolf/linkden/pull/51)).
- Setup wizard surfaces real server errors instead of swallowing them
  ([#51](https://github.com/MrDemonWolf/linkden/pull/51)).
- Backup imports are sanitized; hex-alpha styling guarded
  ([#51](https://github.com/MrDemonWolf/linkden/pull/51)). Imported
  blocks and social networks now go through the same gate as
  `blocks.create` / `social.updateBulk` (`validateBlockImport`,
  `socialNetworkUpdateSchema`): http(s)-only URLs, icon format, per-type
  config. Invalid rows are skipped and counted (`skipped` in the result,
  `backup.import.skipped_rows` audit entry) instead of landing as raw
  `javascript:` hrefs on the public page. The LinkStack importer drops
  non-http(s) links the same way.
- Clearing a block's URL, icon, embed URL, or embed type in the builder
  now persists: the editor sends `""` and the schema's `clearable`
  fields turn it into `null` for the row (`packages/validators/src/blocks.ts`).
- `vcardConfigSchema` is derived from `vcardDataSchema`, so a vCard block
  the builder accepts always passes the stricter download-path parse
  (`/api/vcard`, `public.getVCard`) instead of silently 404ing.
- Public renderers guard stored URLs (`safeHttpUrl`) and look up heading
  levels / icon names with `Object.hasOwn`, so an imported
  `headingLevel: "__proto__"` can no longer crash the server render.

#### Security

- Single-admin invariant enforced by a `BEFORE INSERT` trigger on
  `user` (`0007_single_admin_trigger.sql`), not just middleware
  ([#53](https://github.com/MrDemonWolf/linkden/pull/53)).
- Analytics and CAPTCHA use server-derived `requestMeta`
  (`cf-connecting-ip`, `cf-ipcountry`, UA, referer); CAPTCHA provider is
  an enum that fails closed, with a 10s timeout, `remoteip`, and
  hostname/action verification. Better Auth IP header is
  `cf-connecting-ip` ([#53](https://github.com/MrDemonWolf/linkden/pull/53)).
- Uploads: `Content-Length` rejected before buffering, magic-byte
  signature must match the extension, replaced R2 objects deleted
  ([#53](https://github.com/MrDemonWolf/linkden/pull/53)).
- Rate limits on `/api/auth/request-password-reset` and
  `/api/auth/reset-password` ([#53](https://github.com/MrDemonWolf/linkden/pull/53)).
- Every GitHub Action SHA-pinned with minimal `permissions` blocks
  ([#53](https://github.com/MrDemonWolf/linkden/pull/53)).
- Danger resets, wallet config/preset/signing-key changes, and block
  deletes are written to the audit log
  ([#53](https://github.com/MrDemonWolf/linkden/pull/53)).

## [0.4.0] — 2026-05-10

### ✨ What's new

- **Build a proper Apple Wallet pass.** New pass builder lays out your
  card like a real membership pass — header, primary line, secondary
  fields, image slots, signing keys, and a live preview as you type.
- **Crop every image you upload.** Drag a photo in for your avatar,
  banner, OG image, or wallet logo — a built-in cropper opens with the
  right shape pre-set so nothing comes out stretched.
- **Cleaner settings page.** Settings are now organised into tabs at the
  top with a sticky save bar at the bottom — no more scrolling to find
  the save button.
- **Round or rounded-square social icons.** Pick which shape suits your
  page in Appearance.
- **Big-photo "hero card" layout.** New public-page layout puts a tall
  avatar card up top and stacks your blocks beneath it.
- **Analytics page inside the admin.** See views and clicks without
  leaving the dashboard.
- **Custom login screen.** The split-panel login is now fully
  whitelabel — your logo, your colours, your background image.
- **Setup wizard.** First-time admins get walked through account,
  profile, and theme on a single guided screen.
- **Contact-form inbox.** All visitor messages land in a new
  `/admin/connections` panel with read/unread state.
- **Account page redesign.** Profile, email, password, and danger zone
  are now in calm stacked sections instead of one long form.

### 🔧 Technical

#### Added

- Wallet pass builder (pass.mk-style) with HIG field limits
  (header / primary / secondary / auxiliary / back), template presets,
  image slots, signing-keys section
  ([#31](https://github.com/MrDemonWolf/linkden/pull/31)).
- Universal `ImageCropDialog` wired into `ImageUploadField` with
  per-purpose presets in [`image-crop-presets.ts`](apps/web/src/lib/image-crop-presets.ts)
  ([#31](https://github.com/MrDemonWolf/linkden/pull/31)).
- Admin settings: top-tabs + sticky save bar
  ([#26](https://github.com/MrDemonWolf/linkden/pull/26)).
- `social_icon_shape` setting (`circle` | `rounded-square`)
  ([#23](https://github.com/MrDemonWolf/linkden/pull/23)).
- Hero-card public-page layout, single-column blocks.
- `/admin/analytics` page + shared analytics widgets.
- Split-panel login, sidebar setup wizard, custom login branding.
- `/admin/connections` inbox (uses `forms.*` tRPC router).
- CI workflow: lint / type-check / test / format / build gate
  ([#27](https://github.com/MrDemonWolf/linkden/pull/27)).
- Unit tests for `wallet` + `settings` validators, sanitize utilities,
  and upload validation — focused on security and data contracts.
- `vitest` v8 coverage configuration + `bun run test:coverage` script.

#### Changed

- `/admin/account` redesigned as stacked sections
  ([#28](https://github.com/MrDemonWolf/linkden/pull/28)).
- README and `CLAUDE.md` refreshed to match the current monorepo
  layout ([#30](https://github.com/MrDemonWolf/linkden/pull/30)).
- Upload validation extracted from `apps/server/src/index.ts` into
  [`apps/server/src/lib/upload-validation.ts`](apps/server/src/lib/upload-validation.ts)
  so the rules are unit-testable.
- Patched + minor dependency upgrades across workspaces
  ([#24](https://github.com/MrDemonWolf/linkden/pull/24)).

#### Fixed

- Narrowed `getLoginShaderPreset` return type to `ShaderBannerPreset`.

#### Security

- Per-route Cloudflare rate limiting:
  `RL_AUTH` (10 req / 60s) for login + contact form,
  `RL_STRICT` (5 req / 60s) for password reset, magic link, sign-up,
  `RL_UPLOAD` (20 req / 60s) for image uploads,
  `RL_PUBLIC` for view/click tracking.
- Triple-check upload validation: file size ≤ 5 MB, extension allow-list,
  MIME-type allow-list, purpose allow-list — defends against
  content-type spoofing.
- Single-user signup lock — `/api/auth/sign-up` returns `403` once the
  first user exists.
- Magic-link runtime gate via `magic_link_enabled` setting.
- Security headers on every response: `Strict-Transport-Security`,
  `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`,
  `Referrer-Policy: strict-origin-when-cross-origin`,
  `Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=()`.
- R2 image-serving path-traversal guard (`..` rejected).

## [0.3.0] — 2026-XX-XX

### ✨ What's new

Baseline release. Public profile page, six block types (link, header,
embed, connect, vCard, location), block-level analytics, admin
appearance / SEO / branding panels, vCard export, Apple Wallet pass MVP,
Apple Maps embed for Location blocks, Cloudflare Workers + D1 hosting.

### 🔧 Technical

Documentation sync at commit `1691cc5`. Stack: Hono on Workers, tRPC
v11, Drizzle ORM on D1, Better Auth, Alchemy IaC for deployment.

[Unreleased]: https://github.com/MrDemonWolf/linkden/compare/v0.5.0...HEAD
[0.5.0]: https://github.com/MrDemonWolf/linkden/compare/v0.4.0...v0.5.0
[0.4.0]: https://github.com/MrDemonWolf/linkden/compare/v0.3.0...v0.4.0
[0.3.0]: https://github.com/MrDemonWolf/linkden/releases/tag/v0.3.0

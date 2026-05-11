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

[Unreleased]: https://github.com/MrDemonWolf/linkden/compare/v0.4.0...HEAD
[0.4.0]: https://github.com/MrDemonWolf/linkden/compare/v0.3.0...v0.4.0
[0.3.0]: https://github.com/MrDemonWolf/linkden/releases/tag/v0.3.0

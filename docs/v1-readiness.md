# v1.0.0 Release Readiness

Checklist for cutting **LinkDen 1.0.0**. Items grouped by category. Owner +
status columns are placeholders — fill in as work lands.

## Status legend

- ✅ done
- 🟡 partial — works but needs polish
- ⬜ not started
- ⏭️ deferred past 1.0 (with reason)

## 1. Quality gates

| Item | Status | Notes |
| --- | --- | --- |
| TypeScript strict, zero `any`/`ts-ignore` | ✅ | grep confirms zero |
| Biome lint runs clean in CI (warnings allowed) | ✅ | CI gate in place |
| Biome format check passes | ✅ | except gitignored `.claude/` |
| Unit tests cover validators, sanitize, upload, presets | ✅ | 136 tests, 7 files |
| `bun run check-types` green | ✅ | turbo gate |
| `bun run build` green | ✅ | all 3 apps |
| Coverage report renders (`bun run test:coverage`) | ✅ | v8 provider |
| Coverage floor enforced (e.g. ≥ 60% lines) in CI | ⬜ | add `coverage.thresholds` |
| Worker-runtime integration tests for tRPC routers | ⬜ | see §2 |
| Playwright e2e smoke (login, create link, public page) | ⬜ | see §3 |

## 2. Worker-runtime integration tests (miniflare/D1)

**Goal.** Hit real tRPC routers against an ephemeral D1 database inside the
Workers runtime — catches bugs that unit tests miss (SQL semantics, auth
middleware, R2 bindings, env validation).

**Plan.**

- Add `@cloudflare/vitest-pool-workers` dev dep.
- New `vitest.workers.config.ts` (separate config so node-runtime unit tests
  stay fast).
- Fixture: spin up D1 (in-memory SQLite via miniflare), run Drizzle migrations,
  seed a test user via `auth.api.signUpEmail`.
- Cover happy path of each router in `packages/api/src/routers/*`:
  `settings`, `blocks`, `contacts` (forms), `wallet`, `analytics`, `public`,
  `backup`, `danger`, `vcard`, `social`, `version`.
- New CI step: `bun run test:workers` after the unit tests.

**Acceptance.** ≥ 1 happy-path test per router; auth middleware rejection
verified for protected mutations; ≥ 1 rate-limit hit assertion.

## 3. Playwright e2e

**Goal.** Drive the real admin UI in a headless browser.

**Plan.**

- Add `@playwright/test`.
- `e2e/` folder at repo root.
- `playwright.config.ts` boots `bun dev` (web + server + docs) via
  `webServer`, sets BASE_URL.
- Scenarios:
  1. First-time setup wizard → account created → admin redirect.
  2. Login → create link block → save → visit `/` → click block → click
     tracked in analytics.
  3. Upload avatar via `ImageUploadField` (mock fetch to `/api/upload`).
  4. Submit contact form on public page → row appears in `/admin/connections`.
  5. Public page renders with chosen theme preset + social icon shape.
- New CI step: `bunx playwright test` — Chromium only for 1.0 (Firefox/WebKit
  later).

**Acceptance.** Green on PR. Trace + video uploaded on failure.

## 4. Observability

**Sentry**

- Init Sentry in `apps/web` (browser) and `apps/server` (Workers SDK).
- DSN read from `packages/env`.
- Tag releases with `version.json`.
- Don't send PII: drop `email`, `password`, request bodies.

**Structured logging (Workers)**

- Replace `hono/logger` middleware with a JSON logger emitting
  `{ts, level, msg, requestId, ip?, route}` per request.
- Use `crypto.randomUUID()` for `requestId`, surface it in error responses
  so users can quote it in support.
- Document Logpush / Axiom destination in `apps/docs/content/docs/self-hosting`.

## 5. Release automation

**Release-please**

- Add `.github/workflows/release-please.yml`.
- Conventional Commits enforced via commitlint on PR titles (CI gate).
- Release-please opens a PR with version bump + CHANGELOG regen — merging
  it cuts a tag.

**GitHub Release on tag**

- New `.github/workflows/release.yml`, trigger `on: push: tags: ['v*']`.
- Steps:
  1. Checkout.
  2. Build Docker image (`Dockerfile` already in repo), push to GHCR with
     `:latest` + `:<release-version>` tags (derive from `GITHUB_REF` /
     pushed tag or a `VERSION` env var — never hardcode).
  3. Build `linkden-cli-*` binary via `bun build --compile` for
     linux-x64, linux-arm64, macos-arm64 (admin reset scripts), tagged
     with the same derived version.
  4. `gh release create` with body sourced from the matching CHANGELOG
     section.
- Stretch: SBOM + image signing via cosign.

## 6. Self-host hardening

| Item | Status | Notes |
| --- | --- | --- |
| `Dockerfile` boots cleanly with required envs | 🟡 | verify `bun run reset:password` works in container |
| `docker-compose.yml` + env example | 🟡 | confirm volumes for D1 + R2 emulation |
| Coolify deployment guide in docs | ⬜ | add to `self-hosting/` |
| Database migrations checked in | ⬜ | `bun run db:generate` baseline + commit `packages/db/migrations/` |
| Backup/restore round-trip documented | ⬜ | `backup` router exists — write user-facing guide |
| Factory-reset script tested | ✅ | `bun reset:factory` works |

## 7. Documentation completeness

- `getting-started/` — first-run, signup, theme, first link.
- `guide/` — block types, wallet pass, vCard, contact form, analytics.
- `self-hosting/` — Cloudflare deploy, Coolify deploy, env reference,
  backup, upgrade path.
- `reference/` — settings keys, tRPC routers, REST endpoints (`/api/upload`,
  `/api/images/*`, `/api/health`).
- `changelog/` — done (this doc + mirror).
- Privacy policy + ToS — already in place.

## 8. Compliance posture

- GDPR audit (`docs/gdpr-audit.md`) revisited against current data model.
- ISO 27001 gap analysis (`docs/iso27001-gap-analysis.md`) refreshed.
- Confirm no PII in logs after structured logging lands.
- Confirm DSAR / data-export path: `backup` router output is the user's data.

## 9. Marketing / launch

- Hero screenshot set (light + dark, mobile + desktop).
- Short demo video (≤ 60s).
- Submit to: Awesome Selfhosted, Hacker News (Show HN), Reddit
  r/selfhosted, Producthunt.
- Pin `v1.0.0` release on GitHub.

## Suggested cut criteria for 1.0

All §1 quality gates green, §2 router smoke green, §3 e2e green for the
five core scenarios, §4 Sentry wired, §5 release-please + GitHub Release
workflow tested on a `v0.5.0-rc.0` pre-release, §6 Dockerfile boots a
working stack from scratch.

When all the above are ✅ or 🟡, bump `version.json` to `1.0.0`, open the
release-please PR, merge, ship.

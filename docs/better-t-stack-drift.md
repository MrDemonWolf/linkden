# better-t-stack conformance / drift report

**Date:** 2026-07-10
**Method:** scaffolded a throwaway `better-t-stack@latest` (v3.36.3) with LinkDen's exact
flags, diffed every subsystem against LinkDen 0.4.0 (the current version is in `version.json`;
8 area agents, 76 raw findings).

## Bottom line

**LinkDen already IS the better-t-stack format and layout.** Same architecture end to end:
Next 16 + Hono + tRPC v11 + Cloudflare Workers + D1 + Drizzle + Better Auth + Turborepo,
deployed via **Alchemy IaC + OpenNext** — which is the scaffold's *own* deploy path (the
premise that the scaffold uses OpenNext+Wrangler scripts is wrong; v3.36.3 uses Alchemy too).
The shared `tsconfig.base.json`, drizzle config, and postcss/tailwind setup are byte-identical.

A full rewrite is unwarranted — it would delete a working app to rebuild the same stack.
The real delta is **version freshness + a handful of config knobs**, plus a few genuine
architecture decisions the maintainer should make deliberately.

LinkDen is **ahead** of the scaffold in many places: biome lint/format (scaffold ships none),
security headers/CSP in `next.config.ts`, real scoped PWA manifest, a hand-written service
worker, `peerDependencies` for React in the UI lib, `@types/node` 25 (scaffold: 22),
dev-friendly auth cookies (`secure` derived from URL scheme), and a standalone `apps/docs`.

---

## Applied now (zero-risk format fixes)

| Change | File |
|---|---|
| Exclude Next cache from Turbo artifacts: `"!.next/cache/**"` | `turbo.json` |
| Wire `ui` into typechecking: add `check-types` script + `lib:[ESNext,DOM,DOM.Iterable]` + `types:[]` | `packages/ui/{package.json,tsconfig.json}` |
| Fix 6 latent type errors surfaced by newly-enabled ui typecheck | `packages/ui/src/color-contrast.ts` |
| Restore `skipValidation: !!process.env.SKIP_ENV_VALIDATION` (CI build escape hatch) | `packages/env/src/web.ts` |

---

## Batch A — version alignment (low risk, needs `bun install`)

Bump floors to the scaffold baseline. Highest value = LinkDen's **internal** version skew
(packages disagreeing with LinkDen's own root):

- **alchemy**: `apps/web` + `apps/server` on `^0.89.0` while root/infra are `^0.93.7` → unify to `^0.93.12`
- **zod**: `apps/server` `^4.3.6` → `^4.4.3` (root already there)
- **@cloudflare/workers-types**: align all to `^4.20260702.1`

Framework line bumps (same major, patch/minor behind):
- **better-auth** `^1.6.9` → `1.6.23` (security: raises floor above GHSA-86j7-9j95-vpqj fix; scaffold pins exact — consider dropping the caret)
- **@opennextjs/cloudflare** `1.19.7` → `1.20.1`, **wrangler** `4.88` → `4.107`
- **hono** `4.12.18` → `4.12.27`, **@trpc/\*** `11.17` → `11.18`
- **react/react-dom** `19.2.6` → `19.2.7`, **tanstack query/form**, **tailwind** `4.3.0` → `4.3.2`
- **tsdown** `0.21.10`→`0.22.3`, **turbo** `2.9.14` → `2.10.2`, **bun** `1.3.10` → `1.3.14`
- Remove dead deps from `packages/env` (tailwind, turbo, vitest — no consumer there)

**Applied 2026-07-10.** Typecheck (all packages incl. web+ui) + 96 vitest tests green.
Two deviations from the plan:
- **`libsql`/`@libsql/client` bump SKIPPED.** Bumping `@libsql/client` `0.17.0`→`0.17.4`
  forks drizzle-orm's optional-peer resolution into two nominally-incompatible copies
  (`shouldInlineParams` private-field clash), breaking `server` + `web` typecheck. Kept at
  baseline; it was the lowest-value bump anyway.
- **Added `overrides: { "drizzle-orm": "0.45.2" }`** to root `package.json`. Bun hashes a
  separate drizzle-orm peer-variant per package; bumping trpc/hono in `@linkden/api` shifted
  its variant so it no longer matched `@linkden/db`, reintroducing the same clash in the web
  graph. The override forces one shared instance. (This also newly-exposed a latent web-tsc
  break that CI never caught — web isn't typechecked.)

## Batch B — structural convention

- **Bun workspace `catalog:`** — the one real "format" gap. Scaffold centralizes every shared
  version in root `workspaces.catalog`; LinkDen inlined per-package (the direct cause of the
  alchemy skew above). Adopting it is mechanical but touches every `package.json`; it
  structurally prevents future skew.

**Applied 2026-07-10.** Root `workspaces` is now object-form with a `catalog` block; all shared
cross-workspace deps (`@cloudflare/workers-types`, `@tailwindcss/postcss`, `@trpc/*`,
`@types/react*`, `alchemy`, `better-auth`, `dotenv`, `drizzle-orm`, `hono`, `react`, `react-dom`,
`tailwindcss`, `typescript`, `wrangler`, `zod`) reference it via `"catalog:"`. Verified green
(`turbo check-types` + web tsc + 96 tests). Two deliberate exclusions:
- **`apps/docs` stays off the catalog.** Its fumadocs stack is version-locked — bumping `zod`
  `4.3.6`→`4.4.3` broke fumadocs-mdx's generated `.source` types. Docs keeps its own pins. (The
  scaffold doesn't even emit a docs app, so there's no format mandate here.)
- **`packages/ui` React stays in `peerDependencies` as explicit ranges** (not `catalog:`) — the
  correct shape for a shared component lib, and `catalog:` in peerDeps is unreliable.

## Batch C — bigger decisions

- **TypeScript `^5.9.3` → `^6`** — **APPLIED 2026-07-10.** `^6` → 6.0.3 (ecosystem `latest` is
  already 7.0.2, but the scaffold pins `^6`, so we match). Catalog bump; the *only* fix needed
  was dropping server's deprecated `baseUrl` from `apps/server/tsconfig.json`. `turbo check-types`
  + web tsc (6.0.3) + 96 tests all green. `apps/docs` stays on TS 5.9.3 (off-catalog, fumadocs-locked).
- **lucide-react `^0.577` → `^1.23.0`** — **APPLIED 2026-07-10.** Added to catalog; web references
  `catalog:` (→1.24.0). web tsc clean → all 71 imported icons still exist in 1.x (no removed/renamed
  exports). Visual render check pending a live-preview pass. `apps/docs` stays on 0.577.

- **packages/ui: Radix → Base UI** — **APPLIED 2026-07-10.** `packages/ui` is now **Radix-free**
  (all 11 `@radix-ui/*` deps removed; `@base-ui/react` added). Approach = *delete dead + migrate
  live*: of ~19 exported components, only **9 are actually consumed** by web (avatar, button,
  checkbox, dialog, input, label, separator, switch, tabs) — the other 10 (textarea, select,
  dropdown-menu, card, badge, tooltip, toast, skeleton, icon-button, sheet) were exported but
  never imported anywhere, so they were **deleted**. The 9 live ones were migrated to Base UI
  (`data-[state=*]` → `data-[open/closed/selected/checked/unchecked]`), preserving their exported
  API + custom variants/`--ld-*` theming so consumers (incl. web's re-export wrappers) didn't
  change. `label` → native `<label>`, `button`/`input` were already framework-free. Typecheck
  (ui + web + turbo) + 96 tests green. NOTE: `apps/web` already had its own local
  `components/ui/` on `@base-ui/react`; `packages/ui` was the last Radix holdout.

## Still open (not done)

- **`createDb()` / `createAuth()` factories** vs LinkDen's module singletons (per-request
  Workers pattern). Only worth it if module-scope bindings actually go stale on Workers. Not
  requested in this pass.
- **Runtime/visual check** — **DONE 2026-07-10.** Ran the app standalone and loaded `/admin/login`:
  Base UI Button/Input/Label/Checkbox + lucide 1.x icons all render, zero console errors, and the
  Checkbox toggles correctly at runtime (`aria-checked` + `data-[checked]`/`data-[unchecked]` flip
  on click). Dialog/Tabs use the identical data-attribute pattern. Sonner (not the deleted
  `@linkden/ui` toast) handles app toasts — no regression from the toast deletion.

## Local dev (how to run it)

`bun dev` (Alchemy) is currently blocked by an **expired Cloudflare OAuth token** — Alchemy's
`D1StateStore` tries to reach the remote `alchemy-state` D1 and fails with `invalid_grant`. That's
an environment/auth issue, unrelated to this work; re-auth Cloudflare (e.g. `bunx wrangler login`
/ refresh the Alchemy token) to restore `bun dev` and `bun ship`.

To run locally **without** Cloudflare, use the standalone dev path (miniflare, all local):
- `bun dev:server` → Wrangler dev on :3000 (local D1/R2/rate-limits)
- `bun dev:web` → Next dev on :3001
- First run only: seed the local D1 —
  `cd apps/server && for f in ../../packages/db/src/migrations/*.sql; do bunx wrangler d1 execute linkden-db --local --file="$f" --yes; done`

## Ignore / LinkDen already ahead

Alchemy IaC (scaffold uses it too), security headers, real PWA manifest, biome, React
`peerDependencies`, `@types/node` 25, dark-theme manifest, dev-safe auth cookies, standalone
`apps/docs`, `node --watch` macOS-26 workaround, `wrangler.jsonc` for local standalone dev,
exact-pinned `next`.

## LinkDen-internal follow-ups surfaced (not scaffold drift)

- `apps/web/public/sw.js` is a real service worker but **never registered** → inert dead code.
  Either register it in the admin layout or delete it.
- `packages/ui` was escaping typechecking (now fixed above).

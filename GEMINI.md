# GEMINI.md

Instructions for Gemini CLI and other Gemini-based coding agents working in this repository.

## Canonical repository guidance

Read `CLAUDE.md` completely before changing code. It is the single source for the project
structure, commands, production invariants (single-admin DB trigger, atomic `runBatch` writes,
the settings registry, `version.json` as the only version source, admin-only wallet pass route,
and the rest), design patterns and conventions. Do not copy that guidance into this file; it
drifts.

Then follow the workflow rules in `AGENTS.md` (git hygiene, scope, tooling, verification). If
documentation conflicts with checked-in code, verify the actual behavior and update the stale
documentation in the same change.

A few facts that older copies of this file got wrong:

- The UI library is Base UI (`@base-ui/react`), not Radix.
- `useEntranceAnimation` is used on Insights only; admin pages have no page fade.
- The app version lives in `version.json` only (compared with `compareSemver` in
  `packages/api/src/utils/version.ts`). Never hardcode a version.
- There is no `db:push` script. Schema changes go through `bun run db:generate` migrations,
  which Alchemy applies on `bun dev` / `bun ship`.

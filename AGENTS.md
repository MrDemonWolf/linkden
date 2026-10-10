# AGENTS.md

Instructions for Codex and other GPT coding agents working in this repository.

## Canonical repository guidance

Read `CLAUDE.md` completely before changing code. It contains the project structure, commands,
architecture, and product conventions. Keep shared repository guidance there instead of copying it
into multiple agent files.

This file adds only agent workflow rules. If documentation conflicts with checked-in code or
package manifests, verify actual behavior and update stale documentation in the same change.

## Working agreement

- Inspect `git status` first. Preserve all pre-existing changes and untracked files.
- Keep changes scoped to the request. Avoid speculative abstractions, dependencies, and rewrites.
- Reuse existing utilities, schemas, hooks, and `@linkden/ui` components before adding code.
- Prefer deletion and consolidation when two implementations serve the same purpose.
- Keep framework-neutral data and business logic out of UI packages.
- Add or update the smallest useful test for non-trivial behavior.
- Never commit secrets, generated build output, local databases, or `.claude` worktrees.
- Do not commit, push, deploy, merge, or perform destructive Git operations unless requested.

## Tooling

- Package manager: Bun.
- Run repository scripts with `bun run <script>`.
- Search with `rg` and `rg --files`.
- Format and lint with Biome; do not hand-format around it.
- Update `bun.lock` through Bun, never by hand.
- Preserve the docs app's deliberate dependency pins documented in
  `docs/better-t-stack-drift.md`.

## Verification

Run checks proportional to the change. For repository-wide work, use:

```bash
bun run check-types
bun run lint
bun run format:check
bun run test
bun run build
git diff --check
```

Report each command accurately. If credentials or external services block a check, report the
exact blocker instead of claiming success.

## Documentation

Update `CLAUDE.md` when adding important architecture notes, setup guides, schemas, or documented
problem solutions, following its critical documentation pattern.

<!-- BEGIN:turborepo-agent-rules -->

# This is NOT the Turborepo you know

Turborepo configuration, task behavior, and CLI commands can vary between installed versions and may differ from your training data. Resolve the `turbo` package from this file's directory or relevant workspace; in monorepos, it may not be visible from the repository root. For example, run `node -p "require.resolve('turbo/package.json')"` from a workspace that depends on `turbo`.

Read `docs/README.md` inside that installed package first, then read the relevant pages from its `docs/` directory before changing Turborepo configuration or commands. Heed deprecation notices. These bundled docs match the installed package version and are available without network access.

This block is written and re-added by `turbo` before repository-scoped commands when an AI agent is detected. In the Turborepo source repository, its template is defined in `crates/turborepo-cli/src/cli/agent_guidance.rs`. Removing the managed block while updates are enabled means a later qualifying invocation will add it again. Set `"agentGuidance": false` in the root `turbo.json` or `turbo.jsonc` to opt out; this does not remove an existing block. Keep the block committed with your work to avoid an uncommitted change on the next agent invocation.
<!-- END:turborepo-agent-rules -->

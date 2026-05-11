# LinkDen — Internal Docs Index

Engineering, compliance, and release-planning documents that live outside
the user-facing docs site (`apps/docs`). Add new entries here whenever you
create or discover an architecture diagram, database schema, problem
solution, or setup guide so context isn't lost.

## Release planning

- [`v1-readiness.md`](./v1-readiness.md) — v1.0.0 release readiness
  checklist (quality gates, integration tests, e2e, observability,
  release automation, self-host hardening, docs, compliance, launch).

## Compliance

- [`gdpr-audit.md`](./gdpr-audit.md) — GDPR compliance audit (2026-03-31).
- [`iso27001-gap-analysis.md`](./iso27001-gap-analysis.md) — ISO 27001:2022
  gap analysis (2026-03-31).

## User-facing documentation

Lives at `apps/docs/content/docs/` and ships at the docs site. Includes:

- `getting-started/` — first-run, signup, theme, first link.
- `guide/` — block types, wallet pass, vCard, contact form, analytics.
- `self-hosting/` — Cloudflare deploy, env reference, backup, upgrade path.
- `reference/` — settings keys, tRPC routers, REST endpoints.
- `changelog.mdx` — mirror of root [`CHANGELOG.md`](../CHANGELOG.md).
- `privacy-policy.mdx`, `terms-of-service.mdx`.

## Conventions

- Internal/engineering docs live in this `docs/` directory.
- User-facing docs live in `apps/docs/content/docs/`.
- Root-level docs of record: [`CHANGELOG.md`](../CHANGELOG.md),
  [`README.md`](../README.md), [`CLAUDE.md`](../CLAUDE.md),
  [`version.json`](../version.json).
- When you add a new internal doc, register it here in the appropriate
  section so future maintainers can find it.

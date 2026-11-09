# LinkDen - Self-Hosted Link-in-Bio Platform

LinkDen combines a profile-page builder and a private single-admin editor. It
runs on Cloudflare Workers, D1 and R2, with Next.js, Hono and shared TypeScript
packages.

The current worktree includes a simpler admin interface and an opt-in native
static publisher. **Legacy dynamic serving remains the default.** Local tests,
previews and these notes do not imply that the new publisher or
production routing has been deployed.

## Features

- **Profile builder** — Arrange links, headers, embeds, contact forms, vCards,
  locations, images, text and dividers using the real public renderer in a plain
  document preview. Desktop can use a sticky profile beside stacked blocks, or
  a single vertical layout; narrow pages always stack.
- **Design controls** — Light/dark presets, public colour overrides, custom CSS,
  branding and social icon shapes. The admin uses neutral gray/charcoal surfaces,
  restrained blue accents and a shared footer.
- **Inbox** — Contact submissions with configured CAPTCHA and optional Resend
  notifications. Embedded media has separate click-to-load consent controls.
- **Wallet and vCard** — Design a Wallet card and download a signed `.pkpass`
  through the authenticated editor when usable signing material is configured.
  Visitors can download configured `.vcf` contact details.
- **Data portability** — Protected JSON backup/import and LinkStack import.
  Image references in JSON exports do not include the uploaded image files.
- **Auth controls** — Password sign-in, authenticator/backup-code 2FA,
  database-enforced single admin, optional first-run setup token, secret masking,
  validation and security rate limits. Development login is strict-local only.
- **Privacy** — Profile event collection is retired; historical records/read APIs
  remain compatible.
- **Opt-in frozen publication** — Build approved public-only snapshots, bundled
  uploads and social images, with serialized activation,
  verification and last-good recovery. Cloud integration and cutover remain
  separately approved verification gates.

## Documentation

The docs source is in [`apps/docs`](./apps/docs). Run it locally with:

```bash
bun run dev:docs
```

Open `http://localhost:3002`. Start with the self-hosting
[Cloudflare guide](./apps/docs/content/docs/self-hosting/cloudflare.mdx) and
[environment reference](./apps/docs/content/docs/self-hosting/environment-variables.mdx).

## Local development

Use the Bun version declared by `package.json`, Node.js 24, and installed
repository tools. Standalone local development does not need the shared Alchemy
state store.

```bash
git clone https://github.com/MrDemonWolf/linkden.git
cd linkden
bun install --frozen-lockfile
```

Generate a private local auth secret with `openssl rand -base64 32`. Configure:

```bash
# apps/server/.dev.vars — local Wrangler only; never commit it.
BETTER_AUTH_SECRET=replace-with-your-generated-random-value
BETTER_AUTH_URL=http://localhost:3001
CORS_ORIGIN=http://localhost:3001

# apps/web/.env.local
NEXT_PUBLIC_SERVER_URL=http://localhost:3001
NEXT_PUBLIC_SITE_URL=http://localhost:3001
INTERNAL_SERVER_URL=http://127.0.0.1:3000
```

For a new local database, apply the named migration history from the API package:

```bash
bun run --cwd apps/server wrangler d1 migrations apply linkden-db --local
```

This writes the selected local database. Inspect/export an existing store before
upgrading it; do not reset it or replay every SQL file manually. Alchemy tracks
full migration filenames, including historical names whose numeric prefixes may
coincide. Preserve those identities and the current Drizzle snapshot chain.

Run these in separate terminals:

```bash
bun run dev:server
```

```bash
bun run dev:web
```

Open `http://localhost:3001/admin/setup`, create the single admin, and configure
2FA under Settings → Account. Use the same hostname consistently for the local
API and web app. `DEV_API_ORIGIN` can configure a standalone local web rewrite;
`DEV_LOGIN` and `NEXT_PUBLIC_DEV_LOGIN` remain optional development-only flags.
They do not enable login through tunnels or production pages.

`bun run dev` is the alternative Alchemy development flow. It applies migrations
and needs a configured state store/token. The checked-in shared store belongs to
MrDemonWolf; other self-hosters must configure their own.

| Local service | Default origin |
|---------------|----------------|
| Public page/editor | `http://localhost:3001` |
| API | `http://localhost:3000` |
| Docs | `http://localhost:3002` |

## Deployment and publication

`bun run deploy` provisions/updates the configured Cloudflare app and applies
pending migrations. It is a cloud mutation, not a local preview command. Confirm
the account, existing resources, state store and configuration before approving
it. Production deployment, DNS/routes/certificates, billing and destructive
changes require explicit operator approval.

In default legacy serving, auth, CORS, browser API and public URL values use the
web origin. In opt-in split mode, the approved admin origin handles auth and the
API bridge while a separate target owns the public profile. The API has no public
routes unless one exact contact action is explicitly configured. Protect and
verify admin access and all alternate URLs before cutover.

The public publisher is separately gated by target environment approvals, an
exact trusted `main` renderer commit, successful CI and provider/HTTP checks.
Automation is currently pinned to `MrDemonWolf/linkden`; forks need a reviewed
adaptation. `bun run build:public` creates local artifacts and does not deploy.

A successfully deployed assets-only target can serve ordinary public HTML,
bundled media and static 404s without application Worker, D1 or R2 work
on that delivery path. Admin/auth, publishing, scheduled maintenance, backups,
contact delivery and external content still consume resources. The
[resource model](./apps/docs/content/docs/self-hosting/cloudflare.mdx#resource-use)
is source-derived, not a verified account plan, CPU measurement or savings claim.

## Development commands

| Command | Purpose |
|---------|---------|
| `bun run check-types` | Workspace TypeScript checks |
| `bun run lint` | Biome lint |
| `bun run format:check` | Formatting check |
| `bun run test` | Vitest; `bun test` invokes a different runner |
| `bun run test:coverage` | Vitest coverage and thresholds |
| `bun run test:e2e` | Playwright against the configured local stack |
| `bun run build` | Build apps/packages |
| `bun run build:public <input.json> <out>` | Local frozen public artifacts |
| `bun run db:generate` | Generate source migrations; no database connection needed |

`PW_BASE_URL` and `PW_API_URL` select Playwright targets. Validation scripts do not
prove third-party delivery, deployed access protection or physical Wallet behavior.

Owner recovery commands and destructive operations are documented in
[troubleshooting](./apps/docs/content/docs/self-hosting/troubleshooting.mdx).
There is no `db:push` script; bypassing the migration ledger can lose constraints
such as the single-admin trigger. JSON reset/import and a public site's takedown
are separate operations.

## Tech stack and structure

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 16, React 19, Tailwind CSS v4, Base UI |
| API/auth | Hono, tRPC, Better Auth |
| Data | Drizzle, Cloudflare D1 and R2 |
| Tooling | Repository-pinned Bun, Turborepo, Biome, Vitest, Playwright |
| Deployment | Cloudflare Workers through Alchemy; separately gated native publication |

```text
apps/web/           Next.js editor and legacy public renderer
apps/server/        Hono API and security/maintenance handlers
apps/public/        Frozen static build, publisher and recovery
apps/docs/          Fumadocs site
packages/api/       Protected/public tRPC procedures
packages/auth/      Shared authentication options
packages/db/        Schemas, named migrations and test database helpers
packages/infra/     Alchemy configuration and deployment guards
packages/ui/        Shared UI utilities/components
packages/validators/ Shared runtime contracts and validation
packages/email/     Email templates
packages/env/       Environment handling
packages/config/    Shared TypeScript configuration
scripts/            Local build and owner recovery utilities
```

Reuse shared contracts, components and helpers; keep business rules outside UI
packages. See [`AGENTS.md`](./AGENTS.md) and [`CLAUDE.md`](./CLAUDE.md) before
changing code. Preserve existing work and run checks proportional to the change.

## Change notes

[`CHANGELOG.md`](./CHANGELOG.md) records repository changes; its Unreleased
section describes work awaiting release. [`version.json`](./version.json) is the
canonical version source. A versioned note is not proof of a published GitHub
release or a deployed site.

## License

![GitHub license](https://img.shields.io/github/license/mrdemonwolf/linkden.svg?style=for-the-badge&logo=github)

[MIT](./LICENSE). Public product branding can be replaced; distributed copies
must retain the license's copyright and permission notice.

## Contact

- [Join my Discord server](https://mrdwolf.net/discord)
- [Report an issue](https://github.com/MrDemonWolf/linkden/issues)

Made with love by [MrDemonWolf, Inc.](https://www.mrdemonwolf.com)

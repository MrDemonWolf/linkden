# Design-system screenshots

Scripts that capture the real app for the design-system docs
(`apps/docs/content/docs/design-system/`). They run against a disposable local stack
seeded with a synthetic profile, and write WebP images to
`apps/docs/content/docs/design-system/images/<group>/<name>.webp`.

| File | Purpose |
| --- | --- |
| `lib.ts` | Shared helpers: `BASE_URL`, browser/context factories, `signIn`, `prepare`, `goto`, `shot`, tRPC helpers |
| `fixture.json` | Synthetic sample profile in the backup import format, plus the images and Inbox messages the seed adds |
| `seed.ts` | Idempotent seeding: first-run setup, images, `backup.import` (replace), Inbox messages |
| `capture.ts` | Runner for `groups/<group>.ts` modules |
| `groups/` | One module per image group (`overview`, `foundations`, `components`, `patterns`, `stateful`) |
| `tsconfig.json` | Adds the DOM lib for `page.evaluate` code: `bunx tsc -p scripts/design-screenshots` |

## 1. Start a disposable stack

Never point these scripts at a stack whose data you care about: `seed.ts` replaces all
content. Use a separate worktree, so its env files and local D1/R2 state stay apart from
your normal `bun dev` stack (ports 3000/3001):

```bash
git worktree add --detach ../linkden-shots HEAD
cd ../linkden-shots && bun install

# API env (wrangler dev only, never deployed). DEV_LOGIN needs a plain-http loopback BETTER_AUTH_URL.
cat > apps/server/.dev.vars <<EOF
BETTER_AUTH_SECRET=$(openssl rand -base64 32)
BETTER_AUTH_URL=http://localhost:3101
CORS_ORIGIN=http://localhost:3101
DEV_LOGIN=true
EOF

# Web env: browser calls go through the filesystem API bridge to the API on :3100.
cat > apps/web/.env.local <<EOF
NEXT_PUBLIC_SERVER_URL=http://localhost:3101
NEXT_PUBLIC_SITE_URL=http://localhost:3101
NEXT_PUBLIC_DEV_LOGIN=true
INTERNAL_SERVER_URL=http://127.0.0.1:3100
EOF

# Fresh, isolated database and bucket state.
STATE="$PWD/.shots-state"
bun run --cwd apps/server wrangler d1 migrations apply linkden-db --local --persist-to "$STATE"

# Two terminals (or background them):
bun run --cwd apps/server wrangler dev --ip 127.0.0.1 --port 3100 --persist-to "$STATE"
bun run --cwd apps/web next dev --hostname 127.0.0.1 --port 3101
```

Check `curl http://localhost:3101/api/health` reports `"auth":"ok"`. A clean start is
`rm -rf .shots-state`, then the migration command again.

## 2. Seed

From the main checkout (the scripts only need the stack's URL):

```bash
bun scripts/design-screenshots/seed.ts
```

`DESIGN_SHOTS_URL` overrides the default `http://localhost:3101`. The seed refuses
non-loopback URLs and `:3001`. It:

1. Creates the admin on first run, exactly as `/admin/setup` step 1 does
   (`POST /api/auth/sign-up/email`): **Rowan Ellis**, `rowan@example.com`, password
   `linkden-design-shots-local`. These credentials are synthetic and local-only; dev
   login is used whenever the stack allows it.
2. Generates five abstract images with ImageMagick (`magick`) and uploads them through
   `POST /api/upload`. Unchanged images already on the stack are reused.
3. Imports `fixture.json` `data` with `backup.import` in replace mode, with the uploaded
   paths filled into the targets listed in `seedImages`.
4. Sends the four `seedMessages` through `public.submitContact` (CAPTCHA provider
   `none`), then backdates them (2h, 1d, 3d and 5d) and marks two as read.
5. Restores `contact_form_enabled` to the fixture value.

Running it again resets the stack to the same state. Relative Inbox times ("2h ago") are
computed at seed time, so seed shortly before capturing.

## 3. Capture

```bash
bun scripts/design-screenshots/capture.ts            # every groups/*.ts not starting with "_"
bun scripts/design-screenshots/capture.ts patterns   # just one group
bun scripts/design-screenshots/capture.ts --list
```

Each image is written as a PNG to a temp directory, encoded with `cwebp -q 82`, saved as
`images/<group>/<name>.webp` and recorded in `images/<group>/manifest.json`
(`{ group, name, width, height, bytes, description }`). The runner prints a summary and
exits non-zero when a group fails or an image exceeds 250 KB. The whole images folder
should stay under 8 MB.

### Writing a group module

```ts
// groups/patterns.ts
import type { CaptureContext } from "../lib";

export async function capture(ctx: CaptureContext): Promise<void> {
	for (const scheme of ["light", "dark"] as const) {
		const page = await ctx.page({ device: "desktop", scheme, signedIn: true });
		await ctx.goto(page, "/admin/links");
		await ctx.shot(page, {
			name: `admin-shell-${scheme}`,
			description: `Links destination with the preview column, ${scheme} mode`,
		});
	}
	const crop = await ctx.page({ device: "element", scheme: "light", signedIn: true });
	await ctx.goto(crop, "/admin/links");
	await ctx.shot(crop.getByRole("group", { name: "Book a design review" }), {
		name: "block-row-light",
		description: "One block row: handle, type mark, title and URL, visibility switch",
	});
}
```

- `ctx.page({ device, scheme, signedIn, consent, viewport })` opens a page in a fresh
  context that is closed when the group ends. Devices: `desktop` 1440×900 @1x, `phone`
  390×844 @2x with touch, `element` 1440×900 @2x for crops.
- `ctx.goto(page, path)` navigates and calls `prepare(page)`: reduced motion, Next dev
  indicator and TanStack Query devtools hidden, lazy images loaded, network idle, fonts
  ready, focus cleared. Call `ctx.prepare(page)` again after opening a dialog or menu
  (`{ keepFocus: true }` when the focus ring is the point).
- `ctx.shot(target, { name, description, padding?, fullPage?, clip? })` takes a page
  (viewport, `fullPage` or `clip`) or a Locator (cropped with 16px padding).
- `signedIn: true` reuses one admin session for the whole process. Each new context
  checks it once against the database (`get-session?disableCookieCache=true`, so a
  revoked or replaced session is never taken for a live one) and signs in again only
  when it is gone. The shared cookies leave out Better Auth's `session_data` cache, so
  every context reads fresh user data. A rate-limited check waits and retries instead
  of falling back to password sign-in.
- The admin defaults to dark (next-themes key `theme`); `scheme` stores that choice
  before the page loads. The public page follows `prefers-color-scheme`.
- `consent: "essential"` (default) stores an "Essential only" choice so the public consent
  banner does not cover captures; `consent: "unset"` shows the banner.

### Rules

- Read-only: open editors, dialogs and menus, type unsaved edits, then discard. Never
  Save, Apply, Delete, Reset or Import, and never toggle instant-save switches (the Inbox
  "Accepting messages" switch, block visibility switches). Anything that needs saved
  state belongs to the `stateful` group; run `seed.ts` again after it to restore the
  sample state.
- Names are kebab-case with `-light`/`-dark` and `-mobile` suffixes.
- Never add a design-system route to the product app; capture components where the app
  renders them.

## Sample content

`fixture.json` describes Rowan Ellis of Ellis Studio, a fictional product designer:

- **Profile:** name, bio, verified badge, uploaded avatar and custom banner, Classic
  (`default`) theme preset, split layout, system color mode, circle social icons.
- **Blocks:** one of every block type in `blockTypeSchema`, grouped under three headers:
  featured, thumbnail, highlighted, icon and outlined-emoji links; a YouTube embed
  (click-to-load behind the consent banner); an image with caption; a text block; a dots
  divider; an inline Connect form with "Where did we meet?"; a vCard block; a location
  with a Google Maps link. Plus one draft link and one hidden link for admin states.
- **Social:** Instagram, Dribbble, LinkedIn, YouTube and GitHub (active), X (inactive).
- **Settings:** SEO title/description with the `profile` OG template, privacy and terms
  in text mode, consent banner on, vCard on, contact form on (database delivery, CAPTCHA
  `none`), timezone `America/Los_Angeles`, and a Wallet contact-card design.
- **Inbox:** four messages, two unread.

All names, handles, addresses and links are fictional (`example.com`, `example.org`,
`example.net`). Images are generated shapes with no people, logos or text.

# Go-live checklist

Release notes live in [`CHANGELOG.md`](./CHANGELOG.md).

**One thing at a time. Each box is 15 minutes or less. Stop after each ✅.**

## Today (you, no code)

- [ ] GitHub → repo → Settings → Environments → `production` → add **secrets**: `CLOUDFLARE_API_TOKEN` (perms: Workers Scripts:Edit, Workers Routes:Edit, D1:Edit, R2:Edit, Zone:Read, DNS:Edit, SSL and Certificates:Edit), `CLOUDFLARE_ACCOUNT_ID`, `ALCHEMY_PASSWORD`, `ALCHEMY_STATE_TOKEN` (same as wolfathon), `BETTER_AUTH_SECRET` (`openssl rand -base64 32`), `BETTER_AUTH_URL=https://l.mrdemonwolf.com`, `NEXT_PUBLIC_SERVER_URL=https://l.mrdemonwolf.com`, `CORS_ORIGIN=https://l.mrdemonwolf.com`
- [ ] Same page → **variables**: `NEXT_PUBLIC_SITE_URL=https://linkden.mrdemonwolf.workers.dev` for now (it must be the origin the site is actually served from — the deploy refuses an empty value). Leave `SITE_DOMAIN` **empty** (= staging on workers.dev)
- [ ] Resend: create API key + verify sending domain (needed for password reset)

## When PR 1 merges (staging)

- [ ] Watch Actions → Deploy goes green (first time ever 🎉)
- [ ] Open `https://linkden.mrdemonwolf.workers.dev/api/health` → `"status":"ok"`
- [ ] Admin login on workers.dev **will** redirect-loop (split origin). Expected; test admin locally. Public page + health are what staging proves.

## When PR 2–5 merge (design + admin + validation)

- [ ] `bun dev:server` + `bun dev:web` → `/admin/setup` locally → create your account, import LinkStack export (Settings → Data → Import)
- [ ] Walk `/admin/links` on your phone (same Wi-Fi: `http://<mac-ip>:3001`). Add a Featured link, a Grid header, an Image block
- [ ] Settings → Email → paste Resend key → send yourself a password reset to prove it

## Cutover day (15 min, reversible)

- [ ] Cloudflare DNS → `mrdemonwolf.com` zone → **delete** the existing `l` record (Custom Domain can't be created over a CNAME)
- [ ] GitHub → `production` variables → set `SITE_DOMAIN=l.mrdemonwolf.com` **and** `NEXT_PUBLIC_SITE_URL=https://l.mrdemonwolf.com` (the deploy checks they match)
- [ ] Actions → Deploy → **Run workflow** (or re-run last) → wait green
- [ ] `https://l.mrdemonwolf.com/api/health` → ok; `https://l.mrdemonwolf.com/admin` → login works, no loop
- [ ] `/admin/setup` → account → Settings → Data → **Import** your LinkStack export → Links → Publish
- [ ] Phone: open site, Share → "Add to Home Screen" works
- [ ] Actions → `backup-db` → Run workflow → check `linkden-backups` bucket has today's file
- [ ] `git tag -a v0.5.0 -m "Go live" && git push --tags`

## Rollback (if anything's wrong)

- [ ] Cloudflare DNS → re-create the old `l` record → old site is back in about a minute. Nothing else to undo.

# TODO

## 🔴 Production deploy — configure secrets (blocking)

The **Deploy** workflow (`.github/workflows/deploy.yml`, job `environment: production`)
fails on every run because the GitHub **`production` environment has zero secrets**,
so Alchemy aborts at state-store init with `No credentials found`. Deploy has never
succeeded in CI. Set the secrets below, then re-run.

Set each into the **production** environment (values are prompted — never hit the
shell history or logs):

### Required — Alchemy will not start without these
- [ ] `CLOUDFLARE_API_TOKEN` — **manual**: create at Cloudflare → My Profile → API Tokens
      → "Edit Cloudflare Workers" template (needs Workers Scripts + D1 + R2 edit), then
      `gh secret set CLOUDFLARE_API_TOKEN --env production`
- [ ] `CLOUDFLARE_ACCOUNT_ID` — from `wrangler whoami` or the CF dashboard URL
- [ ] `ALCHEMY_PASSWORD` — state-secret encryption; value already in `packages/infra/.env`

### App runtime — use PRODUCTION values (NOT the localhost values in local `.env`)
- [ ] `BETTER_AUTH_SECRET` — generate fresh for prod: `openssl rand -base64 32`
- [ ] `BETTER_AUTH_URL` — deployed web URL
- [ ] `NEXT_PUBLIC_SERVER_URL` — deployed API (worker) URL; also used by the deploy smoke test
- [ ] `CORS_ORIGIN` — deployed web origin

### Wallet pass — only if the Apple Wallet feature is deployed (guarded in `alchemy.run.ts`)
- [ ] `WALLET_SIGNER_CERT`
- [ ] `WALLET_SIGNER_KEY`
- [ ] `WALLET_WWDR_CERT`
- [ ] `WALLET_TEAM_ID`
- [ ] `WALLET_PASS_TYPE_ID`

### After secrets are set
- [ ] Re-run deploy: `gh run rerun <deploy-run-id>` (or push any commit to `main`)
- [ ] Confirm the deploy log shows the 4 Cloudflare resources **adopted / unchanged** —
      no `create` / `replace` / `delete` on the live Worker / D1 / R2. If any shows
      create/replace on the live **D1 or R2** → stop and revert (an `adopt` is missing).
- [ ] Confirm the smoke test hits `NEXT_PUBLIC_SERVER_URL/api/health` → `{"status":"ok"}`

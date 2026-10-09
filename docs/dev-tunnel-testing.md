# Dev tunnel testing — view a devbox app on any device

Portable recipe for exposing a dev server running on a remote devbox to a
phone/tablet through a Cloudflare **quick tunnel**. Written for LinkDen but the
pattern applies to any project on the box.

## The idea

```
phone ──HTTPS──> xxxx.trycloudflare.com ──> cloudflared (devbox) ──> localhost:PORT
```

- `cloudflared tunnel --url http://localhost:PORT` — no account, no DNS, no
  config. Prints a random `https://<words>.trycloudflare.com` URL.
- URL dies on Ctrl-C and changes every restart. Fine for dev.
- Limits: ~200 concurrent in-flight requests, ~100MB request body, no uptime
  guarantee. Not production.

## The one rule that matters: ONE public origin

If the frontend and API end up on **different** public hostnames, cookie auth
breaks (SameSite=Lax cookies don't cross sites) and CORS fights you. A quick
tunnel forwards a single port, so route everything through one origin:

- **Next.js:** dev-only `rewrites()` proxying API paths to the backend
  (see `apps/web/next.config.ts`, gated on `DEV_API_ORIGIN`).
- **Vite:** `server.proxy` does the same thing out of the box.
- **Anything else:** point the tunnel at whichever process can proxy to the
  other one.

Then set every "public URL" env var to the tunnel origin.

## LinkDen quickstart

```bash
# 1. tunnel first (you need the hostname it prints)
cloudflared tunnel --url http://localhost:3001 --no-autoupdate

# 2. paste https://<host>.trycloudflare.com into:
#    apps/server/.dev.vars  -> BETTER_AUTH_URL, CORS_ORIGIN
#    apps/web/.env.local    -> NEXT_PUBLIC_SERVER_URL
#    (keep DEV_API_ORIGIN=http://127.0.0.1:3000 and
#     INTERNAL_SERVER_URL=http://127.0.0.1:3000 as-is)

# 3. start/restart both dev servers (env is read at boot)
bun dev:server   # wrangler :3000  — NOT `bun dev` (that's the Alchemy path)
bun dev:web      # next :3001

# 4. open the tunnel URL on the phone
```

First boot on a fresh DB: apply migrations first —

```bash
cd apps/server && for f in ../../packages/db/src/migrations/*.sql; do bunx wrangler d1 execute linkden-db --local --file="$f" --yes; done
```

### Gotchas (Next.js specific, learned the hard way)

- `NEXT_PUBLIC_*` vars are **inlined at compile time even in `next dev`** —
  changing the tunnel URL requires restarting `next dev`, not just re-saving.
- `allowedDevOrigins: ["*.trycloudflare.com"]` is required in `next.config.ts`
  or the HMR WebSocket is 403'd and Fast Refresh dies (assets still load,
  which makes it confusing).
- Use `127.0.0.1`, not `localhost`, for proxy destinations — Node may resolve
  `localhost` to `::1` while the backend binds IPv4 only.
- Server-side fetches should use a loopback env var (`INTERNAL_SERVER_URL`),
  not the public origin, or every SSR render hairpins through the internet.
- Rewrites buffer request bodies (default cap 10MB, 30s proxy timeout) —
  fine for normal uploads, raise `experimental.proxyClientMaxBodySize` /
  `proxyTimeout` if needed.

### Security notes (accepted tradeoffs for dev)

- The URL is unauthenticated — anyone who has it reaches the app. Obscurity
  of the random host is the only gate. Kill the tunnel when done.
- Dev login can't be used through a tunnel, by design: LinkDen registers
  `POST /api/auth/dev-login` only when `DEV_LOGIN="true"` AND `BETTER_AUTH_URL`
  is plain `http://` on a loopback host, and the endpoint 404s for any
  non-loopback `Host`. A tunnel needs an `https://` `BETTER_AUTH_URL`, so sign in
  with a real account instead.
- On a fresh LinkDen DB, complete `/admin/setup` immediately — first account
  becomes the single admin. Setting `SETUP_TOKEN` in `apps/server/.dev.vars`
  closes that window (enter it in the wizard's Setup token field).
- With an `https://` tunnel `BETTER_AUTH_URL`, `BETTER_AUTH_SECRET` must be 32+
  characters and not a placeholder, or auth answers 503.
- Want a stable hostname + real auth? Use a **named** tunnel
  (`cloudflared tunnel login` + a domain on Cloudflare): stable host,
  path-based ingress (no rewrites needed), and Cloudflare Access (free email
  OTP gate) in front. Worth it if phone testing becomes routine.

## E2E tests against the tunnel

Playwright is split from the unit suite:

```bash
bun run test          # Vitest unit/integration only (unchanged)
bun run test:e2e      # Playwright (e2e/*.spec.ts, desktop + mobile chromium)
bun run test:all      # both
```

While the app is built against a tunnel origin, the browser must use that same
origin (CORS allows exactly one):

```bash
PW_BASE_URL=https://<host>.trycloudflare.com bun run test:e2e
```

`PW_API_URL` (default `http://127.0.0.1:3000`) is the API origin the smoke test
calls directly for `public.getPage`; override it when the API is not on local
port 3000.

Without a tunnel (plain localhost env), `bun run test:e2e` works as-is and
will boot the dev servers itself if they're not already running.

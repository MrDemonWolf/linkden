import { trpcServer } from "@hono/trpc-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { createContext } from "./context";
import type { Env } from "./env";
import { appRouter } from "./router";

type HonoEnv = { Bindings: Env };

const app = new Hono<HonoEnv>();

app.use(
  "/*",
  cors({
    origin: (origin, c) => {
      const allowed = c.env.CORS_ORIGIN || "http://localhost:3001";
      if (origin === allowed) return origin;
      const origins = allowed.split(",").map((o) => o.trim());
      if (origins.includes(origin)) return origin;
      return origins[0];
    },
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  }),
);

/**
 * Cloudflare Cache API middleware for public tRPC queries.
 * Caches unauthenticated GET requests at the edge for 10 minutes
 * with stale-while-revalidate for an additional hour.
 */
app.use("/trpc/*", async (c, next) => {
  if (c.req.method !== "GET") {
    await next();
    return;
  }

  // Skip cache for authenticated requests
  const authHeader = c.req.header("Authorization");
  if (authHeader) {
    await next();
    return;
  }

  const cfCaches = globalThis.caches as unknown as { default: Cache };
  if (!cfCaches?.default) {
    await next();
    return;
  }

  const cache = cfCaches.default;
  const cacheKey = new Request(c.req.url, { method: "GET" });

  const cached = await cache.match(cacheKey);
  if (cached) {
    // Serve from edge cache
    return new Response(cached.body, {
      status: cached.status,
      headers: {
        ...Object.fromEntries(cached.headers.entries()),
        "X-Cache": "HIT",
      },
    });
  }

  await next();

  // Cache successful public responses
  if (c.res.status === 200) {
    const response = c.res.clone();
    const headers = new Headers(response.headers);
    headers.set("Cache-Control", "public, s-maxage=600, stale-while-revalidate=3600");
    headers.set("X-Cache", "MISS");

    const cachedResponse = new Response(response.body, {
      status: response.status,
      headers,
    });
    c.executionCtx.waitUntil(cache.put(cacheKey, cachedResponse));
  }
});

app.use(
  "/trpc/*",
  trpcServer({
    router: appRouter,
    createContext: ({ req }, c) => createContext(req, c.env),
  }),
);

app.post("/analytics/ping", async (c) => {
  const body = await c.req.json();
  const db = (await import("@linkden/db")).createDb(c.env.DB);
  const { analytics } = await import("@linkden/db/schema");

  await db.insert(analytics).values({
    event: body.event ?? "page_view",
    linkId: body.linkId ?? null,
    referrer: body.referrer ?? "",
    userAgent: c.req.header("User-Agent") ?? "",
    country: c.req.header("CF-IPCountry") ?? "",
  });

  return c.json({ ok: true });
});

export default app;

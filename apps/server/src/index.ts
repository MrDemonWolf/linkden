import { Hono } from "hono";
import { cors } from "hono/cors";
import { trpcServer } from "@hono/trpc-server";
import { appRouter } from "./router";
import { createContext } from "./context";
import type { Env } from "./env";

type HonoEnv = { Bindings: Env };

const app = new Hono<HonoEnv>();

app.use(
  "/*",
  cors({
    origin: (origin, c) => {
      const allowed = c.env.CORS_ORIGIN || "http://localhost:3001";
      if (origin === allowed) return origin;
      // Allow multiple origins separated by commas
      const origins = allowed.split(",").map((o) => o.trim());
      if (origins.includes(origin)) return origin;
      return origins[0];
    },
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);

app.use(
  "/trpc/*",
  trpcServer({
    router: appRouter,
    createContext: ({ req }, c) => createContext(req, c.env),
  })
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

app.get("/pass", (c) => {
  return c.json({ message: "Wallet pass endpoint. Use /trpc/wallet.generate for pass generation." });
});

export default app;

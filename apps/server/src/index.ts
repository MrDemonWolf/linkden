import { trpcServer } from "@hono/trpc-server";
import { createContext } from "@linkden/api/context";
import { appRouter } from "@linkden/api/routers/index";
import { auth } from "@linkden/auth";
import { env } from "@linkden/env/server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";

type Bindings = {
  IMAGES_BUCKET?: R2Bucket;
};

const app = new Hono();

app.use(logger());
app.use(
  "/*",
  cors({
    origin: env.CORS_ORIGIN,
    allowMethods: ["GET", "POST", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  }),
);

app.on(["POST", "GET"], "/api/auth/*", (c) => auth.handler(c.req.raw));

app.use(
  "/trpc/*",
  trpcServer({
    router: appRouter,
    createContext: (_opts, context) => {
      return createContext({ context });
    },
  }),
);

// Image upload endpoint (requires auth)
app.post("/api/upload", async (c) => {
  // Verify auth
  const session = await auth.api.getSession({
    headers: c.req.raw.headers,
  });
  if (!session) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const bucket = (env as unknown as Bindings).IMAGES_BUCKET;
  if (!bucket) {
    return c.json({ error: "Image storage not configured" }, 500);
  }

  const formData = await c.req.formData();
  const file = formData.get("file") as File | null;
  const purpose = formData.get("purpose") as string | null;

  if (!file) {
    return c.json({ error: "No file provided" }, 400);
  }

  const validPurposes = ["avatar", "banner", "og_image", "wallet_logo"];
  const filePurpose = validPurposes.includes(purpose ?? "") ? purpose : "misc";
  const ext = file.name.split(".").pop() || "bin";
  const key = `${filePurpose}/${Date.now()}.${ext}`;

  await bucket.put(key, file.stream(), {
    httpMetadata: { contentType: file.type },
  });

  const publicUrl = `/api/images/${key}`;

  return c.json({ publicUrl });
});

// Serve images from R2
app.get("/api/images/*", async (c) => {
  const bucket = (env as unknown as Bindings).IMAGES_BUCKET;
  if (!bucket) {
    return c.json({ error: "Image storage not configured" }, 500);
  }

  const key = c.req.path.replace("/api/images/", "");
  const object = await bucket.get(key);

  if (!object) {
    return c.notFound();
  }

  const headers = new Headers();
  headers.set("Content-Type", object.httpMetadata?.contentType || "application/octet-stream");
  headers.set("Cache-Control", "public, max-age=31536000, immutable");

  return new Response(object.body, { headers });
});

app.get("/", (c) => {
  return c.text("OK");
});

export default app;

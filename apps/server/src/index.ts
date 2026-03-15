import { cloudflareRateLimiter } from "@hono-rate-limiter/cloudflare";
import { trpcServer } from "@hono/trpc-server";
import { createContext } from "@linkden/api/context";
import { appRouter } from "@linkden/api/routers/index";
import { auth } from "@linkden/auth";
import { db } from "@linkden/db";
import { user, siteSettings } from "@linkden/db/schema/index";
import { env } from "@linkden/env/server";
import { eq } from "drizzle-orm";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";

// File upload validation constants
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_EXTENSIONS = new Set(["jpg", "jpeg", "png", "gif", "webp", "svg", "ico"]);
const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/svg+xml",
  "image/x-icon",
  "image/vnd.microsoft.icon",
]);

type Bindings = {
  IMAGES_BUCKET?: R2Bucket;
  RL_AUTH: RateLimit;
  RL_STRICT: RateLimit;
  RL_UPLOAD: RateLimit;
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

// Rate limiters (Cloudflare native rate limiting: RL_AUTH=10/60s, RL_STRICT=5/60s, RL_UPLOAD=20/60s)
const rlKeyGenerator = (c: { req: { header: (name: string) => string | undefined } }) =>
  c.req.header("cf-connecting-ip") ?? "";

app.use("/api/auth/sign-in/*", cloudflareRateLimiter<{ Bindings: Bindings }>({
  rateLimitBinding: (c) => c.env.RL_AUTH,
  keyGenerator: rlKeyGenerator,
}));
app.use("/api/auth/forget-password", cloudflareRateLimiter<{ Bindings: Bindings }>({
  rateLimitBinding: (c) => c.env.RL_STRICT,
  keyGenerator: rlKeyGenerator,
}));
// Block magic link requests when the feature is disabled
app.use("/api/auth/magic-link/*", async (c, next) => {
	const [row] = await db.select().from(siteSettings).where(eq(siteSettings.key, "magic_link_enabled"));
	if (row?.value === "false") {
		return c.json({ error: "Magic link sign-in is disabled" }, 403);
	}
	await next();
});
app.use("/api/auth/magic-link/*", cloudflareRateLimiter<{ Bindings: Bindings }>({
  rateLimitBinding: (c) => c.env.RL_STRICT,
  keyGenerator: rlKeyGenerator,
}));
// Block registration after the first user has been created (single-user app)
app.use("/api/auth/sign-up/*", async (c, next) => {
	const [existingUser] = await db.select({ id: user.id }).from(user).limit(1);
	if (existingUser) {
		return c.json({ error: "Registration is closed" }, 403);
	}
	await next();
});
app.use("/api/auth/sign-up/*", cloudflareRateLimiter<{ Bindings: Bindings }>({
  rateLimitBinding: (c) => c.env.RL_STRICT,
  keyGenerator: rlKeyGenerator,
}));
app.use("/trpc/public.submitContact*", cloudflareRateLimiter<{ Bindings: Bindings }>({
  rateLimitBinding: (c) => c.env.RL_AUTH,
  keyGenerator: rlKeyGenerator,
}));
app.use("/api/upload", cloudflareRateLimiter<{ Bindings: Bindings }>({
  rateLimitBinding: (c) => c.env.RL_UPLOAD,
  keyGenerator: rlKeyGenerator,
}));

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

  // Validate file size
  if (file.size > MAX_FILE_SIZE) {
    return c.json({ error: "File too large. Maximum size is 5MB." }, 413);
  }

  // Validate file extension
  const ext = (file.name.split(".").pop() || "").toLowerCase();
  if (!ALLOWED_EXTENSIONS.has(ext)) {
    return c.json({ error: `File type not allowed. Allowed types: ${[...ALLOWED_EXTENSIONS].join(", ")}` }, 400);
  }

  // Validate MIME type
  if (!ALLOWED_MIME_TYPES.has(file.type)) {
    return c.json({ error: `MIME type not allowed: ${file.type}` }, 400);
  }

  const validPurposes = ["avatar", "banner", "og_image", "wallet_logo", "logo", "favicon"];
  const filePurpose = validPurposes.includes(purpose ?? "") ? purpose : "misc";
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

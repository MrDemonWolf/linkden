// ─── Server Entry Point ────────────────────────────────────────────────────
// Hono app running on Cloudflare Workers. Handles:
//   1. Auth routes (Better Auth)
//   2. tRPC API (all admin + public endpoints)
//   3. Image upload/serving (R2)
//   4. Downloads: public /api/vcard, private /api/admin/wallet-pass (.pkpass)
//   5. /api/health + the daily retention cron (`scheduled`)
//
// Rate limiting uses Cloudflare's native rate limiter (configured in
// wrangler.jsonc + packages/infra/alchemy.run.ts). Keys are the client IP, with
// IPv6 collapsed to its /64 so address rotation inside one allocation shares a
// bucket:
//   - RL_AUTH (10 req/60s): login, 2FA, contact form — generous for real users
//   - RL_STRICT (5 req/60s): password reset, magic link, signup — tight to prevent abuse
//   - RL_UPLOAD (20 req/60s): image uploads — higher since admin may batch-upload
//   - RL_PUBLIC (60 req/60s): view/click tracking, vCard download — unauthenticated traffic
//   - RL_SIGNIN (30 req/60s, optional): one shared bucket per auth route (per
//     Cloudflare location), so the single admin account can't be brute-forced
//     by rotating through many source addresses
// tRPC procedures are limited per call, not per URL: a batched request
// (`/trpc/a,b,c?batch=1`) spends one token per limited procedure in it.
//
// Errors: unhandled exceptions (Hono + tRPC + cron) are logged as one-line JSON
// so Workers observability can filter on `level` / `path` (see lib/log.ts).
// Request lines carry the path only — never query strings or reset tokens.
//
// Security patterns:
//   - Auth config guard: with an unusable BETTER_AUTH_SECRET, /api/auth/*,
//     /trpc/*, /api/upload and /api/admin/* answer 503 (auth is never built);
//     /api/health stays up and reports `auth: "misconfigured"`.
//   - Signup lock: after the first user registers, /sign-up returns 403 here;
//     the DB trigger (0007_single_admin_trigger.sql) is the real enforcement.
//   - Magic link gate: both the send and verify steps are refused unless the
//     magic_link_enabled setting is "true", so admins can disable it at runtime.
//   - Same-origin writes: POSTs to /trpc/* and /api/upload must come from the
//     site origin (CORS alone doesn't stop same-site cookie-carrying requests).
//   - Body limits on /api/auth/* and /trpc/* before anything parses a body.
//   - File upload validation: extension + MIME + Content-Length precheck, then
//     the magic-byte signature must match the extension before writing to R2.

import { trpcServer } from "@hono/trpc-server";
import { createContext } from "@linkden/api/context";
import { appRouter } from "@linkden/api/routers/index";
import { submitContact } from "@linkden/api/routers/public";
import { runScheduledPublication } from "@linkden/api/routers/publication";
import { resolvePublicVcard } from "@linkden/api/routers/vcard";
import {
	dispatchPublication,
	publicationConfiguration,
} from "@linkden/api/utils/publication-dispatch";
import { auth, authConfigProblem, getSessionQuery } from "@linkden/auth";
import { db } from "@linkden/db";
import { siteSettings, user } from "@linkden/db/schema/index";
import { contactSubmissionSchema } from "@linkden/validators/blocks";
import {
	normalizeRelevantDate,
	parsePassLocationsJson,
	resolvePassContent,
} from "@linkden/validators/wallet";
import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import { type Context, Hono, type MiddlewareHandler } from "hono";
import { cors } from "hono/cors";
import { HTTPException } from "hono/http-exception";
import { bodyWithinLimit, countedBodyLimit } from "./lib/body-limit";
import { buildHealth } from "./lib/health";
import { logError, redactLogPath } from "./lib/log";
import { allowedOrigin, isTrustedRequestOrigin, publicContactOrigin } from "./lib/origin";
import { generatePkpass } from "./lib/pkpass";
import { rateLimitKey, trpcProcedurePaths } from "./lib/rate-limit";
import { collectReferencedKeys, runScheduledMaintenance } from "./lib/retention-sweep";
import { splitApiIngress } from "./lib/split-ingress";
import {
	buildR2Key,
	isServableImageKey,
	MAX_UPLOAD_BODY_SIZE,
	replacementKeyForPurpose,
	signatureMatchesExt,
	validateUpload,
	validateUploadContentLength,
} from "./lib/upload-validation";

// Rate-limit bindings are optional; a missing binding is a no-op.
type Bindings = {
	LINKDEN_SERVING_MODE?: string;
	PUBLIC_CONTACT_URL?: string;
	CORS_ORIGIN?: string;
	PUBLIC_SITE_URL?: string;
	IMAGES_BUCKET?: R2Bucket;
	RL_AUTH?: RateLimit;
	RL_STRICT?: RateLimit;
	RL_UPLOAD?: RateLimit;
	RL_PUBLIC?: RateLimit;
	RL_SIGNIN?: RateLimit;
	WALLET_SIGNER_CERT?: string;
	WALLET_SIGNER_KEY?: string;
	WALLET_WWDR_CERT?: string;
	WALLET_TEAM_ID?: string;
	WALLET_PASS_TYPE_ID?: string;
	WALLET_SIGNER_KEY_PASSPHRASE?: string;
};

type Variables = {
	/** Procedure paths of the current /trpc request, parsed like tRPC does. */
	trpcProcedures: string[];
};

type AppEnv = { Bindings: Bindings; Variables: Variables };

/**
 * Max procedures per batched tRPC request. Keep it at or above the web
 * client's httpBatchLink `maxItems`, or a legitimate batch is rejected.
 */
const TRPC_MAX_BATCH_SIZE = 20;
const AUTH_BODY_LIMIT = 64 * 1024;
const TRPC_BODY_LIMIT = 1024 * 1024;
const BACKUP_BODY_LIMIT = 16 * 1024 * 1024;
const RATE_LIMIT_MESSAGE = "Too many requests, please try again later.";
const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

const app = new Hono<AppEnv>();

// Unhandled route errors: keep HTTPException status codes (4xx thrown on
// purpose), log everything else and hide internals from the client.
app.onError((err, c) => {
	if (err instanceof HTTPException) return err.getResponse();
	logError({ path: c.req.path, method: c.req.method }, err);
	return c.json({ error: "Internal error" }, 500);
});

// Security headers
app.use("/*", async (c, next) => {
	await next();
	c.res.headers.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
	c.res.headers.set("X-Content-Type-Options", "nosniff");
	c.res.headers.set("X-Frame-Options", "DENY");
	c.res.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
	c.res.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=(), payment=()");
});

// Request log: method, path, status, duration. Path only — query strings
// (magic-link / verify-email tokens) and the reset-password token segment are
// never written to Worker logs.
app.use("/*", async (c, next) => {
	const start = Date.now();
	await next();
	console.log(
		`${c.req.method} ${redactLogPath(c.req.path)} ${c.res.status} ${Date.now() - start}ms`,
	);
});

// In split mode public ingress is one opt-in action, before CORS/auth or any storage read.
app.use("/*", async (c, next) => {
	const ingress = splitApiIngress(c.req.raw, c.env ?? {});
	if (ingress === "allow") return next();
	c.header("Cache-Control", "no-store");
	return ingress === "not-found"
		? c.json({ error: "Not found" }, 404)
		: c.json({ error: "Public ingress is not configured" }, 503);
});

const adminCors = cors({
	origin: (origin, c) => (origin === allowedOrigin(c.env?.CORS_ORIGIN) ? origin : null),
	credentials: true,
	allowMethods: ["GET", "POST", "OPTIONS"],
	allowHeaders: ["Content-Type", "Authorization"],
});
app.use("/*", (c, next) => (c.req.path === "/api/contact" ? next() : adminCors(c, next)));

app.use("/api/contact", async (c, next) => {
	c.header("Cache-Control", "no-store");
	if (c.req.method !== "POST" && c.req.method !== "OPTIONS")
		return c.json({ error: "Method not allowed" }, 405);
	const origin = publicContactOrigin(c.env?.PUBLIC_SITE_URL);
	if (!origin) return c.json({ error: "Public contact is not configured" }, 503);
	if (c.req.header("origin") !== origin)
		return c.json({ error: "Public contact origin is not allowed" }, 403);
	if (c.req.header("cookie") || c.req.header("authorization"))
		return c.json({ error: "Public contact does not accept account credentials" }, 403);
	if (
		c.req.method === "OPTIONS" &&
		(c.req.header("access-control-request-method") !== "POST" ||
			(c.req.header("access-control-request-headers") || "")
				.split(",")
				.some((header) => header.trim() && header.trim().toLowerCase() !== "content-type"))
	)
		return c.json({ error: "Unsupported public contact preflight" }, 403);
	await next();
});
app.use(
	"/api/contact",
	cors({
		origin: (origin, c) => (origin === publicContactOrigin(c.env?.PUBLIC_SITE_URL) ? origin : null),
		credentials: false,
		allowMethods: ["POST", "OPTIONS"],
		allowHeaders: ["Content-Type"],
	}),
);
app.use("/api/contact", countedBodyLimit(AUTH_BODY_LIMIT));

// Auth misconfigured (empty / short / placeholder BETTER_AUTH_SECRET): every
// route that needs a session answers 503 instead of touching Better Auth, while
// /api/health stays up and reports it. Production deploys refuse such a secret
// up front (packages/infra deployEnvErrors); this covers a hand-edited Worker.
let authProblemLogged = false;
const requireAuthConfig: MiddlewareHandler<AppEnv> = async (c, next) => {
	if (!authConfigProblem) return next();
	if (!authProblemLogged) {
		authProblemLogged = true;
		logError({ path: c.req.path, check: "auth-config" }, new Error(authConfigProblem));
	}
	return c.json({ error: "Service unavailable: authentication is misconfigured" }, 503);
};
app.use("/api/auth/*", requireAuthConfig);
app.use("/trpc/*", requireAuthConfig);
app.use("/api/upload", requireAuthConfig);
app.use("/api/admin/*", requireAuthConfig);

// Same-origin writes. Better Auth checks Origin on /api/auth/* itself.
const requireSameOrigin: MiddlewareHandler<AppEnv> = async (c, next) => {
	if (SAFE_METHODS.has(c.req.method)) return next();
	const trusted = isTrustedRequestOrigin({
		origin: c.req.header("origin"),
		secFetchSite: c.req.header("sec-fetch-site"),
		allowed: allowedOrigin(c.env?.CORS_ORIGIN),
		self: new URL(c.req.url).origin,
	});
	if (!trusted) return c.json({ error: "Cross-site request blocked" }, 403);
	await next();
};
app.use("/trpc/*", requireSameOrigin);
app.use("/api/upload", requireSameOrigin);

// Cap request bodies before Better Auth / tRPC buffer and parse them.
app.use("/api/auth/*", countedBodyLimit(AUTH_BODY_LIMIT));

// ─── Rate limiting ───────────────────────────────────────────────────────────
type Limiter = (env: Bindings) => RateLimit | undefined;
type KeyFn = (c: Context<AppEnv>) => string;

const clientKey: KeyFn = (c) => rateLimitKey(c.req.header("cf-connecting-ip"));
const globalKey =
	(name: string): KeyFn =>
	() =>
		`global:${name}`;

/** One limiter token per request; no-op when the binding is absent. */
const rateLimit =
	(pick: Limiter, key: KeyFn = clientKey): MiddlewareHandler<AppEnv> =>
	async (c, next) => {
		const binding = pick(c.env ?? {});
		if (binding && !(await binding.limit({ key: key(c) })).success) {
			return c.text(RATE_LIMIT_MESSAGE, 429);
		}
		await next();
	};

app.use(
	"/api/contact",
	rateLimit((env) => env.RL_AUTH),
);
app.post("/api/contact", async (c) => {
	if (c.req.header("content-type")?.split(";")[0]?.trim().toLowerCase() !== "application/json")
		return c.json({ error: "Send contact fields as JSON" }, 415);
	let body: unknown;
	try {
		body = await c.req.json();
	} catch {
		return c.json({ error: "Invalid contact JSON" }, 400);
	}
	const parsed = contactSubmissionSchema.strict().safeParse(body);
	if (!parsed.success)
		return c.json({ error: "Check the contact fields and required consent" }, 400);
	const expectedOrigin = publicContactOrigin(c.env?.PUBLIC_SITE_URL);
	if (!expectedOrigin) return c.json({ error: "Public contact is not configured" }, 503);
	const headers = new Headers();
	const ip = c.req.header("cf-connecting-ip");
	if (ip) headers.set("cf-connecting-ip", ip);
	try {
		return c.json(
			await submitContact(parsed.data, { headers, expectedOrigin, requireCaptcha: true }),
		);
	} catch (error) {
		if (error instanceof TRPCError) {
			if (error.code === "BAD_REQUEST") return c.json({ error: error.message }, 400);
			if (error.code === "FORBIDDEN") return c.json({ error: error.message }, 403);
			if (error.code === "TOO_MANY_REQUESTS") return c.json({ error: error.message }, 429);
		}
		console.error(JSON.stringify({ level: "error", path: "/api/contact", stage: "delivery" }));
		return c.json({ error: "Contact service is unavailable. Please try again later." }, 503);
	}
});

const isMagicLinkEnabled = (value: string | null | undefined) => value === "true";

// Refuse magic-link sends and verifies unless the setting is exactly "true"
// (unset = off, matching the login UI and Better Auth's sendMagicLink check).
const magicLinkGate: MiddlewareHandler<AppEnv> = async (c, next) => {
	const [row] = await db
		.select({ value: siteSettings.value })
		.from(siteSettings)
		.where(eq(siteSettings.key, "magic_link_enabled"));
	if (!isMagicLinkEnabled(row?.value)) {
		return c.json({ error: "Magic link sign-in is disabled" }, 403);
	}
	await next();
};

// Per-IP limits run before the global ones, so one noisy client is cut off
// without draining the shared bucket.
app.use(
	"/api/auth/sign-in/*",
	rateLimit((env) => env.RL_AUTH),
);
app.use(
	"/api/auth/sign-in/*",
	rateLimit((env) => env.RL_SIGNIN, globalKey("sign-in")),
);
app.use("/api/auth/sign-in/magic-link", magicLinkGate);
app.use(
	"/api/auth/sign-in/magic-link",
	rateLimit((env) => env.RL_STRICT),
);
app.use(
	"/api/auth/two-factor/*",
	rateLimit((env) => env.RL_AUTH),
);
app.use(
	"/api/auth/two-factor/*",
	rateLimit((env) => env.RL_SIGNIN, globalKey("two-factor")),
);
app.use(
	"/api/auth/request-password-reset",
	rateLimit((env) => env.RL_STRICT),
);
app.use(
	"/api/auth/request-password-reset",
	rateLimit((env) => env.RL_SIGNIN, globalKey("password-reset")),
);
app.use(
	"/api/auth/reset-password",
	rateLimit((env) => env.RL_STRICT),
);
app.use("/api/auth/magic-link/*", magicLinkGate);
app.use(
	"/api/auth/magic-link/*",
	rateLimit((env) => env.RL_STRICT),
);
// Signup: limiter first, then the single-admin lock.
app.use(
	"/api/auth/sign-up/*",
	rateLimit((env) => env.RL_STRICT),
);
// Block registration after the first user has been created (single-user app)
app.use("/api/auth/sign-up/*", async (c, next) => {
	const [existingUser] = await db.select({ id: user.id }).from(user).limit(1);
	if (existingUser) {
		return c.json({ error: "Registration is closed" }, 403);
	}
	await next();
});
app.use(
	"/api/upload",
	rateLimit((env) => env.RL_UPLOAD),
);
app.use(
	"/api/vcard",
	rateLimit((env) => env.RL_PUBLIC),
);
app.use(
	"/api/admin/wallet-pass",
	rateLimit((env) => env.RL_STRICT),
);

// ─── tRPC guards: batch size, body size, per-procedure limits ────────────────
const TRPC_LIMITS = new Map<string, Limiter>([
	["public.submitContact", (env) => env.RL_AUTH],
	["public.trackView", (env) => env.RL_PUBLIC],
	["public.trackClick", (env) => env.RL_PUBLIC],
]);
const trpcBodyLimit = countedBodyLimit(TRPC_BODY_LIMIT);
const backupBodyLimit = countedBodyLimit(BACKUP_BODY_LIMIT);

app.use("/trpc/*", async (c, next) => {
	const procedures = trpcProcedurePaths(new URL(c.req.url));
	if (!procedures || procedures.length > TRPC_MAX_BATCH_SIZE) {
		return c.json({ error: "Invalid or oversized tRPC batch" }, 400);
	}
	c.set("trpcProcedures", procedures);
	await next();
});
// Backup import is the only procedure that legitimately sends large bodies, and
// only a request made solely of backup calls gets the large limit (the web
// client sends backup.* unbatched): a mixed batch would otherwise make tRPC
// parse a 16MB body for its public procedures.
app.use("/trpc/*", (c, next) =>
	c.get("trpcProcedures").every((p) => p.startsWith("backup."))
		? backupBodyLimit(c, next)
		: trpcBodyLimit(c, next),
);
// Every limited procedure in the batch spends its own token, so neither a
// leading unlimited procedure nor N copies of a limited one gets past the cap.
app.use("/trpc/*", async (c, next) => {
	const key = clientKey(c);
	for (const procedure of c.get("trpcProcedures")) {
		const binding = TRPC_LIMITS.get(procedure)?.(c.env ?? {});
		if (binding && !(await binding.limit({ key })).success) {
			return c.text(RATE_LIMIT_MESSAGE, 429);
		}
	}
	await next();
});

app.on(["POST", "GET"], "/api/auth/*", (c) => auth.handler(c.req.raw));

app.use(
	"/trpc/*",
	trpcServer({
		router: appRouter,
		maxBatchSize: TRPC_MAX_BATCH_SIZE,
		createContext: (_opts, context) => {
			return createContext({ context });
		},
		// Expected client errors (UNAUTHORIZED, BAD_REQUEST, ...) are noise; only
		// log what a developer needs to act on.
		onError: ({ error, path }) => {
			if (error.code !== "INTERNAL_SERVER_ERROR") return;
			logError({ path: path ?? "trpc", code: error.code }, error.cause ?? error);
		},
	}),
);

// Image upload endpoint (requires auth)
app.post("/api/upload", async (c) => {
	// Verify auth
	const session = await auth.api.getSession({
		headers: c.req.raw.headers,
		query: getSessionQuery(c.req.method),
	});
	if (!session) {
		return c.json({ error: "Unauthorized" }, 401);
	}

	const bucket = c.env.IMAGES_BUCKET;
	if (!bucket) {
		return c.json({ error: "Image storage not configured" }, 500);
	}

	// Reject oversized uploads before buffering the whole multipart body.
	const contentLength = validateUploadContentLength(c.req.header("content-length"));
	if (!contentLength.ok) {
		return c.json({ error: contentLength.error }, contentLength.status);
	}
	if (!(await bodyWithinLimit(c, MAX_UPLOAD_BODY_SIZE))) {
		return c.json({ error: "File too large. Maximum size is 5MB." }, 413);
	}

	const formData = await c.req.formData();
	// `unknown` + instanceof: the Node and Workers type libs disagree on
	// FormData.get's return type (string-only in the 2021 Workers types).
	const file: unknown = formData.get("file");
	const purpose: unknown = formData.get("purpose");

	if (!file) {
		return c.json({ error: "No file provided" }, 400);
	}
	if (!(file instanceof File)) {
		return c.json({ error: "Invalid file provided" }, 400);
	}

	const result = validateUpload({
		fileName: file.name,
		fileSize: file.size,
		mimeType: file.type,
		purpose,
	});
	if (!result.ok) {
		return c.json({ error: result.error }, result.status);
	}

	// Validate the actual file signature, not just the client-supplied name/MIME.
	const header = new Uint8Array(await file.slice(0, 12).arrayBuffer());
	if (!signatureMatchesExt(result.ext, header)) {
		return c.json({ error: "File content does not match its type." }, 400);
	}

	const key = buildR2Key(result.purpose, result.ext, crypto.randomUUID());

	await bucket.put(key, file.stream(), {
		httpMetadata: { contentType: file.type },
	});

	// `replaces` names an earlier upload from the same unsaved edit, so it
	// doesn't linger until the orphan sweep. Never delete an object a saved
	// setting or block still points at: the live page would lose its image if
	// the edit is then discarded. Saved-then-replaced objects are left to the
	// daily orphan sweep (24h grace).
	const oldKey = replacementKeyForPurpose(formData.get("replaces"), result.purpose);
	if (oldKey && oldKey !== key && !(await collectReferencedKeys()).has(oldKey)) {
		await bucket
			.delete(oldKey)
			.catch((err) => logError({ path: "/api/upload", step: "delete-replaced" }, err));
	}

	const publicUrl = `/api/images/${key}`;

	return c.json({ publicUrl });
});

/** The colo's edge cache, when the runtime has one (not in Node/vitest). */
function edgeCache(): Cache | undefined {
	return typeof caches !== "undefined" && "default" in caches ? caches.default : undefined;
}

/** Register background work; a no-op without an execution context. */
function waitUntil(c: Context<AppEnv>, promise: Promise<unknown>) {
	try {
		c.executionCtx.waitUntil(promise);
	} catch {
		// No ExecutionContext (e.g. app.request in tests) — let it float.
	}
}

// Serve images from R2
app.get("/api/images/*", async (c) => {
	const bucket = c.env.IMAGES_BUCKET;
	if (!bucket) {
		return c.json({ error: "Image storage not configured" }, 500);
	}

	const key = c.req.path.replace("/api/images/", "");
	if (key.includes("..")) {
		return c.json({ error: "Invalid path" }, 400);
	}
	// Only key shapes this app writes can exist; skip the R2 read otherwise.
	if (!isServableImageKey(key)) {
		return c.notFound();
	}

	// Workers run in front of Cloudflare's CDN cache, so a Worker response is
	// only edge-cached when put there explicitly. Keys are random and never
	// reused, so cached copies never need purging. The cache key drops the
	// query string so `?x=` can't force an R2 read.
	const cache = edgeCache();
	const cacheKey = new Request(new URL(c.req.path, c.req.url).toString());
	const hit = await cache?.match(cacheKey).catch(() => undefined);
	if (hit) return new Response(hit.body, hit);

	const object = await bucket.get(key);

	if (!object) {
		return c.notFound();
	}

	const headers = new Headers();
	headers.set("Content-Type", object.httpMetadata?.contentType || "application/octet-stream");
	headers.set("Cache-Control", "public, max-age=31536000, immutable");
	headers.set("ETag", object.httpEtag);

	const res = new Response(object.body, { headers });
	if (cache)
		waitUntil(
			c,
			cache.put(cacheKey, res.clone()).catch(() => {}),
		);
	return res;
});

// ─── Apple Wallet pass (.pkpass) ─────────────────────────────────────────────
// Admin-only download. Assembles a signed pass from the wallet_* settings + profile.
// Content (fields capped per section, colours, issuer, description, barcode)
// comes from resolvePassContent, shared with the wallet router's
// generatePreview, so the builder preview shows what Wallet renders.

async function fetchPassImage(
	bucket: R2Bucket | undefined,
	url: string | undefined,
): Promise<Uint8Array | undefined> {
	if (!bucket || !url) return undefined;
	// Only R2-hosted PNGs are usable — Wallet rejects non-PNG pass images.
	const match = /\/api\/images\/(.+)$/.exec(url);
	const key = match?.[1];
	if (!key || key.includes("..")) return undefined;
	const object = await bucket.get(key);
	if (!object) return undefined;
	if ((object.httpMetadata?.contentType || "") !== "image/png") return undefined;
	return new Uint8Array(await object.arrayBuffer());
}

app.get("/api/admin/wallet-pass", async (c) => {
	c.header("Cache-Control", "private, no-store");
	const session = await auth.api.getSession({
		headers: c.req.raw.headers,
		query: getSessionQuery(c.req.method),
	});
	if (!session) return c.json({ error: "Unauthorized" }, 401);

	const settingsRows = await db.select().from(siteSettings);
	const s: Record<string, string> = {};
	for (const row of settingsRows) s[row.key] = row.value;

	if (s.wallet_pass_enabled !== "true") return c.notFound();

	const signerCertPem = s.wallet_signer_cert || c.env.WALLET_SIGNER_CERT;
	const signerKeyPem = s.wallet_signer_key || c.env.WALLET_SIGNER_KEY;
	const wwdrCertPem = s.wallet_wwdr_cert || c.env.WALLET_WWDR_CERT;
	const teamIdentifier = s.wallet_team_id || c.env.WALLET_TEAM_ID;
	const passTypeIdentifier = s.wallet_pass_type_id || c.env.WALLET_PASS_TYPE_ID;
	if (!signerCertPem || !signerKeyPem || !wwdrCertPem || !teamIdentifier || !passTypeIdentifier) {
		return c.text("Wallet pass is not available yet.", 503);
	}

	const [profile] = await db.select().from(user).limit(1);
	const content = resolvePassContent(s, profile);
	const publicProfileUrl = publicContactOrigin(c.env.PUBLIC_SITE_URL ?? c.env.CORS_ORIGIN);
	if (content.showBarcode && !publicProfileUrl)
		return c.text("Wallet public profile URL is misconfigured.", 503);

	const bucket = c.env.IMAGES_BUCKET;
	const [icon, logo, thumbnail, strip] = await Promise.all([
		fetchPassImage(bucket, s.wallet_icon_url),
		fetchPassImage(bucket, s.wallet_logo_url),
		fetchPassImage(bucket, s.wallet_thumbnail_url),
		fetchPassImage(bucket, s.wallet_strip_url),
	]);

	try {
		const bundle = await generatePkpass(
			{
				passTypeIdentifier,
				teamIdentifier,
				serialNumber: profile?.id || "linkden-pass",
				organizationName: content.organizationName,
				description: content.description,
				backgroundColor: content.backgroundColor,
				foregroundColor: content.foregroundColor,
				labelColor: content.labelColor,
				logoText: s.wallet_organization_name || undefined,
				barcodeMessage: content.showBarcode ? publicProfileUrl : null,
				// Writes are validated; this only hardens legacy stored values.
				relevantDate: normalizeRelevantDate(s.wallet_relevant_date),
				locations: parsePassLocationsJson(s.wallet_locations),
				headerFields: content.headerFields,
				primaryFields: content.primaryFields,
				secondaryFields: content.secondaryFields,
				auxiliaryFields: content.auxiliaryFields,
				backFields: content.backFields,
				images: { icon, logo, thumbnail, strip },
			},
			{
				signerCertPem,
				signerKeyPem,
				wwdrCertPem,
				signerKeyPassphrase: c.env.WALLET_SIGNER_KEY_PASSPHRASE,
			},
		);

		const slug = (s.wallet_organization_name || profile?.name || "linkden")
			.toLowerCase()
			.replace(/[^a-z0-9]+/g, "-")
			.replace(/^-|-$/g, "");
		return new Response(bundle as unknown as BodyInit, {
			headers: {
				"Content-Type": "application/vnd.apple.pkpass",
				"Content-Disposition": `attachment; filename="${slug || "linkden"}.pkpass"`,
				"Cache-Control": "private, no-store",
			},
		});
	} catch (err) {
		logError({ path: "/api/admin/wallet-pass", step: "generate" }, err);
		return c.text("Wallet pass is not available yet.", 503);
	}
});

// ─── vCard download (.vcf) ───────────────────────────────────────────────────
// Public download, gated on the vcard_enabled setting (resolvePublicVcard is the
// single source). `?block=<id>` is a vCard block's own button: that block's
// card or 404. Without it (the footer pill): the first live vCard block, else
// the global vCard saved under Design → Branding (`vcard_data`).
const VCARD_BLOCK_ID_MAX = 100;
app.get("/api/vcard", async (c) => {
	const blockParam = c.req.query("block");
	// An oversized id can't be a block id; treat it as absent.
	const blockId = blockParam && blockParam.length <= VCARD_BLOCK_ID_MAX ? blockParam : undefined;
	const vcard = await resolvePublicVcard(new Date(), blockId);
	if (!vcard) return c.notFound();

	return new Response(vcard.vcardString, {
		headers: {
			"Content-Type": "text/vcard; charset=utf-8",
			"Content-Disposition": 'attachment; filename="contact.vcf"',
		},
	});
});

app.get("/", (c) => {
	return c.text("OK");
});

app.get("/api/health", async (c) => {
	const report = await buildHealth(db, { authConfigured: !authConfigProblem });
	return c.json(report, report.status === "ok" ? 200 : 503);
});

export default {
	fetch: app.fetch,
	// Cron-triggered maintenance (see wrangler.jsonc [triggers]/crons). Each step
	// logs its own failure; the rejection marks the invocation as an exception.
	async scheduled(event: ScheduledController, env: Bindings, ctx: ExecutionContext) {
		if (event.cron === "*/5 * * * *") {
			ctx.waitUntil(
				runScheduledPublication(
					publicationConfiguration(env),
					(job) => dispatchPublication(env, job),
					new Date(),
				).catch((error) => {
					logError({ path: "scheduled", step: "publication" }, error);
					throw new Error("Scheduled publication failed");
				}),
			);
		} else if (event.cron === "0 3 * * *") {
			ctx.waitUntil(runScheduledMaintenance(env.IMAGES_BUCKET, new Date()));
		}
	},
};

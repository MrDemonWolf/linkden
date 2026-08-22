// ─── Server Entry Point ────────────────────────────────────────────────────
// Hono app running on Cloudflare Workers. Handles:
//   1. Auth routes (Better Auth)
//   2. tRPC API (all admin + public endpoints)
//   3. Image upload/serving (R2)
//   4. Public downloads: /api/vcard, /api/wallet-pass (.pkpass)
//   5. /api/health + the daily retention cron (`scheduled`)
//
// Rate limiting uses Cloudflare's native rate limiter with four limiters
// (configured in wrangler.jsonc + packages/infra/alchemy.run.ts, per IP):
//   - RL_AUTH (10 req/60s): login, contact form — generous for real users
//   - RL_STRICT (5 req/60s): password reset, magic link, signup — tight to prevent abuse
//   - RL_UPLOAD (20 req/60s): image uploads — higher since admin may batch-upload
//   - RL_PUBLIC (60 req/60s): view/click tracking, vCard download — unauthenticated traffic
//
// Errors: unhandled exceptions (Hono + tRPC + cron) are logged as one-line JSON
// so Workers observability can filter on `level` / `path`.
//
// Security patterns:
//   - Signup lock: after the first user registers, /sign-up returns 403 here;
//     the DB trigger (0007_single_admin_trigger.sql) is the real enforcement.
//   - Magic link gate: checks the magic_link_enabled setting before allowing
//     magic link auth requests, so admins can disable it at runtime.
//   - File upload validation: extension + MIME + Content-Length precheck, then
//     the magic-byte signature must match the extension before writing to R2.

import { trpcServer } from "@hono/trpc-server";
import { cloudflareRateLimiter } from "@hono-rate-limiter/cloudflare";
import { createContext } from "@linkden/api/context";
import { appRouter } from "@linkden/api/routers/index";
import { generateVCardString, vcardDataSchema } from "@linkden/api/routers/vcard";
import { auth, getSessionQuery } from "@linkden/auth";
import { db } from "@linkden/db";
import { block, siteSettings, user } from "@linkden/db/schema/index";
import { parsePassFieldsJson, parsePassLocationsJson } from "@linkden/validators/wallet";
import { and, asc, eq } from "drizzle-orm";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { HTTPException } from "hono/http-exception";
import { logger } from "hono/logger";
import { buildHealth } from "./lib/health";
import { generatePkpass } from "./lib/pkpass";
import { runScheduledMaintenance } from "./lib/retention-sweep";
import {
	buildR2Key,
	MAX_UPLOAD_BODY_SIZE,
	signatureMatchesExt,
	validateUpload,
} from "./lib/upload-validation";

type Bindings = {
	CORS_ORIGIN?: string;
	IMAGES_BUCKET?: R2Bucket;
	RL_AUTH: RateLimit;
	RL_STRICT: RateLimit;
	RL_UPLOAD: RateLimit;
	RL_PUBLIC: RateLimit;
	WALLET_SIGNER_CERT?: string;
	WALLET_SIGNER_KEY?: string;
	WALLET_WWDR_CERT?: string;
	WALLET_TEAM_ID?: string;
	WALLET_PASS_TYPE_ID?: string;
	WALLET_SIGNER_KEY_PASSPHRASE?: string;
};

const app = new Hono<{ Bindings: Bindings }>();

/** One-line JSON error log, shared by the Hono, tRPC, and cron error paths. */
function logError(fields: Record<string, unknown>, err: unknown) {
	const e = err instanceof Error ? err : new Error(String(err));
	console.error(JSON.stringify({ level: "error", ...fields, message: e.message, stack: e.stack }));
}

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

app.use(logger());
app.use(
	"/*",
	cors({
		origin: (origin, c) => {
			const allowed = c.env?.CORS_ORIGIN || "http://localhost:3001";
			return origin === allowed ? origin : null;
		},
		credentials: true,
		allowMethods: ["GET", "POST", "OPTIONS"],
		allowHeaders: ["Content-Type", "Authorization"],
	}),
);

// Rate limiters (Cloudflare native rate limiting; see header comment for the four limiters)
const rlKeyGenerator = (c: { req: { header: (name: string) => string | undefined } }) =>
	c.req.header("cf-connecting-ip") ?? "";

// Local `wrangler dev` (miniflare) does not simulate `rate_limits` bindings, so
// env.RL_* are undefined there and @hono-rate-limiter/cloudflare crashes with
// "Cannot read properties of undefined (reading 'limit')" — which 500s every
// auth/upload route on a fresh local install. No-op when the binding is absent;
// production (Alchemy) always provides the bindings.
const rateLimit = (pickBinding: (env: Bindings) => RateLimit | undefined) => {
	const limiter = cloudflareRateLimiter<{ Bindings: Bindings }>({
		rateLimitBinding: (c) => pickBinding(c.env) as RateLimit,
		keyGenerator: rlKeyGenerator,
	});
	const passthrough: ReturnType<typeof cloudflareRateLimiter<{ Bindings: Bindings }>> = (
		c,
		next,
	) => (pickBinding(c.env) ? limiter(c, next) : next());
	return passthrough;
};

app.use(
	"/api/auth/sign-in/*",
	rateLimit((env) => env.RL_AUTH),
);
app.use(
	"/api/auth/request-password-reset",
	rateLimit((env) => env.RL_STRICT),
);
app.use(
	"/api/auth/reset-password",
	rateLimit((env) => env.RL_STRICT),
);
// Block magic link requests when the feature is disabled
app.use("/api/auth/magic-link/*", async (c, next) => {
	const [row] = await db
		.select()
		.from(siteSettings)
		.where(eq(siteSettings.key, "magic_link_enabled"));
	if (row?.value === "false") {
		return c.json({ error: "Magic link sign-in is disabled" }, 403);
	}
	await next();
});
app.use(
	"/api/auth/magic-link/*",
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
	"/api/auth/sign-up/*",
	rateLimit((env) => env.RL_STRICT),
);
app.use(
	"/trpc/public.submitContact*",
	rateLimit((env) => env.RL_AUTH),
);
app.use(
	"/api/upload",
	rateLimit((env) => env.RL_UPLOAD),
);
app.use(
	"/trpc/public.trackView*",
	rateLimit((env) => env.RL_PUBLIC),
);
app.use(
	"/trpc/public.trackClick*",
	rateLimit((env) => env.RL_PUBLIC),
);
app.use(
	"/api/vcard",
	rateLimit((env) => env.RL_PUBLIC),
);

app.on(["POST", "GET"], "/api/auth/*", (c) => auth.handler(c.req.raw));

app.use(
	"/trpc/*",
	trpcServer({
		router: appRouter,
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
	const contentLength = Number(c.req.header("content-length") ?? "0");
	if (contentLength > MAX_UPLOAD_BODY_SIZE) {
		return c.json({ error: "File too large. Maximum size is 5MB." }, 413);
	}

	const formData = await c.req.formData();
	const file = formData.get("file");
	const purpose = formData.get("purpose");

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

	// Delete the object this upload replaces, so old avatars/banners don't
	// accumulate as orphans in R2.
	const replaces = formData.get("replaces");
	if (typeof replaces === "string") {
		const marker = "/api/images/";
		const idx = replaces.indexOf(marker);
		const oldKey = idx >= 0 ? replaces.slice(idx + marker.length) : "";
		if (oldKey && oldKey !== key && !oldKey.includes("..")) {
			await bucket.delete(oldKey).catch(() => {});
		}
	}

	const publicUrl = `/api/images/${key}`;

	return c.json({ publicUrl });
});

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
	const object = await bucket.get(key);

	if (!object) {
		return c.notFound();
	}

	const headers = new Headers();
	headers.set("Content-Type", object.httpMetadata?.contentType || "application/octet-stream");
	headers.set("Cache-Control", "public, max-age=31536000, immutable");

	return new Response(object.body, { headers });
});

// ─── Apple Wallet pass (.pkpass) ─────────────────────────────────────────────
// Public download. Assembles a signed pass from the wallet_* settings + profile.
// Field/location parsing is shared with the wallet router via @linkden/validators.
const parsePassFields = parsePassFieldsJson;
const parsePassLocations = parsePassLocationsJson;

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

app.get("/api/wallet-pass", async (c) => {
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

	const showName = s.wallet_show_name !== "false";
	const showEmail = s.wallet_show_email !== "false";
	const primaryStored = parsePassFields(s.wallet_primary_fields);
	const secondaryStored = parsePassFields(s.wallet_secondary_fields);
	const primaryFields =
		primaryStored.length > 0
			? primaryStored
			: showName && profile?.name
				? [{ key: "name", label: "Name", value: profile.name }]
				: [];
	const secondaryFields =
		secondaryStored.length > 0
			? secondaryStored
			: showEmail && profile?.email
				? [{ key: "email", label: "Email", value: profile.email }]
				: [];

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
				organizationName: s.wallet_organization_name || "LinkDen",
				description:
					s.wallet_pass_description ||
					(profile?.name ? `${profile.name} — contact card` : "Contact card"),
				backgroundColor: s.wallet_background_color || "#091533",
				foregroundColor: s.wallet_foreground_color || "#FFFFFF",
				labelColor: s.wallet_label_color || "#0FACED",
				logoText: s.wallet_organization_name || undefined,
				barcodeMessage: s.wallet_show_qr_code !== "false" ? c.env.CORS_ORIGIN || null : null,
				relevantDate: s.wallet_relevant_date || null,
				locations: parsePassLocations(s.wallet_locations),
				headerFields: parsePassFields(s.wallet_header_fields),
				primaryFields,
				secondaryFields,
				auxiliaryFields: parsePassFields(s.wallet_auxiliary_fields),
				backFields: parsePassFields(s.wallet_back_fields),
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
				"Cache-Control": "no-store",
			},
		});
	} catch (err) {
		console.error("pkpass generation failed", err);
		return c.text("Wallet pass is not available yet.", 503);
	}
});

// ─── vCard download (.vcf) ───────────────────────────────────────────────────
// Public download. Mirrors public.getVCard: requires the vcard_enabled setting
// plus the first enabled, published vCard block, and generates the .vcf with
// the same generator the tRPC endpoint uses.
app.get("/api/vcard", async (c) => {
	const [vcardSetting] = await db
		.select()
		.from(siteSettings)
		.where(eq(siteSettings.key, "vcard_enabled"));
	if (vcardSetting?.value !== "true") return c.notFound();

	const [vcardBlock] = await db
		.select()
		.from(block)
		.where(and(eq(block.type, "vcard"), eq(block.isEnabled, true), eq(block.status, "published")))
		.orderBy(asc(block.position))
		.limit(1);
	if (!vcardBlock) return c.notFound();

	let config: unknown = {};
	try {
		config = vcardBlock.config ? JSON.parse(vcardBlock.config) : {};
	} catch {
		// Corrupted JSON in block config — treat as no vCard rather than crashing
		return c.notFound();
	}
	const result = vcardDataSchema.safeParse(config);
	if (!result.success) return c.notFound();

	return new Response(generateVCardString(result.data), {
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
	const report = await buildHealth(db);
	return c.json(report, report.status === "ok" ? 200 : 503);
});

export default {
	fetch: app.fetch,
	// Cron-triggered maintenance (see wrangler.jsonc [triggers]/crons).
	async scheduled(event: ScheduledController, env: Bindings, ctx: ExecutionContext) {
		ctx.waitUntil(
			runScheduledMaintenance(env.IMAGES_BUCKET).catch((err) =>
				logError({ path: "scheduled", method: event.cron }, err),
			),
		);
	},
};

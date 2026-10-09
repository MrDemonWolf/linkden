// Env-free Better Auth configuration. index.ts builds the production instance
// from `createAuthOptions` with the D1 binding and the Worker env; the tests
// build theirs from the same factory with an in-memory libsql database, so the
// plugins, hooks and email flows they exercise are the ones production runs
// (index.ts pulls in cloudflare:workers + a live D1 binding, so it can't be
// imported there).

import * as authSchema from "@linkden/db/schema/auth";
import { type AnySqliteDb, readSettings } from "@linkden/db/settings-read";
import type { BetterAuthOptions } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { APIError, createAuthMiddleware } from "better-auth/api";
import { magicLink, twoFactor } from "better-auth/plugins";
// Type-only: Better Auth's plugin types expose zod schemas, so the declaration
// emit of createAuthOptions (and anything inferred from it) must be able to name
// `zod/v4/core` through this package's own dependency (TS2883 otherwise).
import type {} from "zod/v4/core";
import { devLoginPlugin, isDevLoginEnabled } from "./dev-login";
import { isLocalHttpURL } from "./local-url";

/**
 * Seconds the signed `session_data` cookie is trusted without a DB read.
 * Bounded low on purpose: a revoked or deleted session stays valid for at most
 * this long on GET requests. Mutations never use the cache (see
 * `getSessionQuery`), so admin writes are always checked against the DB.
 */
export const SESSION_COOKIE_CACHE_MAX_AGE = 60;

export const sessionOptions = {
	cookieCache: {
		enabled: true,
		maxAge: SESSION_COOKIE_CACHE_MAX_AGE,
	},
} as const;

/**
 * Web and API share one origin in production (API is routed under the site
 * domain), so host-only cookies are enough. A split-origin deploy would need
 * crossSubDomainCookies with a shared parent domain.
 */
export function cookieAttributes(baseURL: string | undefined) {
	return {
		sameSite: "lax",
		secure: !!baseURL?.startsWith("https"),
		httpOnly: true,
	} as const;
}

/**
 * `auth.api.getSession` query for a request: reads may use the cookie cache,
 * anything that can change state (tRPC mutations and uploads are POST) must
 * hit the session table so a factory reset / revoke takes effect immediately.
 */
export function getSessionQuery(method: string) {
	return { disableCookieCache: method.toUpperCase() !== "GET" };
}

export const MIN_AUTH_SECRET_LENGTH = 32;

/**
 * Better Auth's built-in fallback secret. It is public (in Better Auth's
 * source), so it must never sign anything. Mirrored by
 * BETTER_AUTH_DEFAULT_SECRET in packages/infra/deploy-config.ts.
 */
export const BETTER_AUTH_DEFAULT_SECRET = "better-auth-secret-12345678901234567890";

// Values that must never sign production cookies: Better Auth's built-in
// fallback and the placeholders from our own docs/CI.
const PLACEHOLDER_SECRETS = new Set([
	BETTER_AUTH_DEFAULT_SECRET,
	"your-secret-key-here",
	"your-secret-here",
	"your-generated-secret",
	"ci-placeholder-secret-for-build",
]);

/**
 * Why BETTER_AUTH_SECRET can't be used, or null when it can. Pure (never
 * throws). Better Auth silently falls back to its public default secret when
 * the value is empty and only refuses that when NODE_ENV === "production"
 * (never true on Workers), so this check is ours. A plain-http loopback base
 * URL (`bun dev`) only needs a non-empty value, so the .env.example
 * placeholder still works locally.
 */
export function authSecretProblem(
	secret: string | undefined,
	baseURL: string | undefined,
): string | null {
	const value = secret?.trim() ?? "";
	if (!value) {
		return "BETTER_AUTH_SECRET is not set. Generate one with `openssl rand -base64 32`.";
	}
	if (isLocalHttpURL(baseURL)) return null;
	if (value.length < MIN_AUTH_SECRET_LENGTH || PLACEHOLDER_SECRETS.has(value)) {
		return `BETTER_AUTH_SECRET must be a random value of at least ${MIN_AUTH_SECRET_LENGTH} characters (not a placeholder). Generate one with \`openssl rand -base64 32\`.`;
	}
	return null;
}

/**
 * The trimmed secret, or throws with authSecretProblem's reason. For callers
 * that must fail closed on the spot (tests, scripts); the Worker instead
 * leaves `auth` unconstructed (see index.ts) so /api/health stays up.
 */
export function resolveAuthSecret(secret: string | undefined, baseURL: string | undefined): string {
	const problem = authSecretProblem(secret, baseURL);
	if (problem) throw new Error(problem);
	return secret?.trim() ?? "";
}

/** Magic links live this long; the email copy quotes it. */
export const MAGIC_LINK_EXPIRES_IN_SECONDS = 10 * 60;

export const EMAIL_NOT_CONFIGURED_MESSAGE =
	"Email delivery is not configured. Add a Resend API key under Settings › Email first.";

export type AuthEmail = { to: string; subject: string; html: string };

type EndpointContext = NonNullable<Parameters<Parameters<typeof magicLink>[0]["sendMagicLink"]>[1]>;

export interface AuthOptionsDeps {
	/** Drizzle instance: D1 in the Worker, in-memory libsql in tests. */
	db: AnySqliteDb;
	/** Already validated with `resolveAuthSecret`. */
	secret: string;
	baseURL: string;
	trustedOrigins?: string[];
	/** Raw DEV_LOGIN binding; see `isDevLoginEnabled`. */
	devLogin?: string;
	/**
	 * Deliver an auth email. Must not throw when email delivery is not
	 * configured: password reset and magic link answer the same either way.
	 */
	sendEmail: (email: AuthEmail) => Promise<void>;
	/** Whether auth email can be delivered at all (Resend provider, API key and sender set). */
	isEmailConfigured: () => Promise<boolean>;
}

/**
 * Who may receive a magic link: the single admin, and only while 2FA is off.
 * A magic link is a complete sign-in on its own (Better Auth's 2FA hook only
 * guards password sign-in), so with 2FA on it would skip the second factor.
 */
async function isMagicLinkRecipient(ctx: EndpointContext, email: unknown): Promise<boolean> {
	if (typeof email !== "string" || !email.trim()) return false;
	const found = await ctx.context.internalAdapter.findUserByEmail(email.trim().toLowerCase());
	if (!found) return false;
	return !(found.user as { twoFactorEnabled?: boolean | null }).twoFactorEnabled;
}

/**
 * Magic link is off unless `magic_link_enabled` is exactly "true" (the same
 * predicate as the server's route gate and the login page).
 */
async function assertMagicLinkEnabled(db: AnySqliteDb): Promise<void> {
	const { magic_link_enabled } = await readSettings(db, ["magic_link_enabled"]);
	if (magic_link_enabled !== "true") {
		throw new APIError("FORBIDDEN", { message: "Magic link sign-in is disabled" });
	}
}

export function createAuthOptions(deps: AuthOptionsDeps) {
	const { db, sendEmail } = deps;

	return {
		database: drizzleAdapter(db, {
			provider: "sqlite",
			schema: authSchema,
		}),
		trustedOrigins: deps.trustedOrigins,
		emailAndPassword: {
			enabled: true,
			// A reset is what the owner does after suspecting compromise: end
			// every existing session, not only future ones.
			revokeSessionsOnPasswordReset: true,
			sendResetPassword: async ({ user, url }) => {
				// Unconfigured email stays silent here: the endpoint must answer the
				// same for known and unknown addresses (no account enumeration).
				await sendEmail({
					to: user.email,
					subject: "Reset your LinkDen password",
					html: `<p>Click the link below to reset your password:</p><p><a href="${url}">${url}</a></p><p>This link expires in 1 hour. If you didn't request this, ignore this email.</p>`,
				});
			},
		},
		// Only the change-email flow reaches this: sign-up/sign-in never send
		// verification mail (sendOnSignUp / requireEmailVerification are off) and
		// the admin is created verified (databaseHooks below). Step 2 of 2: the
		// link that actually switches the address goes to the NEW mailbox.
		emailVerification: {
			sendVerificationEmail: async ({ user, url }) => {
				await sendEmail({
					to: user.email,
					subject: "Verify your new LinkDen email",
					html: `<p>Click the link below to finish changing your LinkDen email to this address:</p><p><a href="${url}">${url}</a></p><p>If you didn't request this, ignore this email.</p>`,
				});
			},
		},
		user: {
			changeEmail: {
				enabled: true,
				// Step 1 of 2: confirm from the CURRENT address, so a hijacked session
				// alone cannot move the account to an attacker's mailbox.
				sendChangeEmailConfirmation: async ({ user, newEmail, url }) => {
					await sendEmail({
						to: user.email,
						subject: "Confirm your new LinkDen email",
						html: `<p>You requested to change your LinkDen email to <strong>${newEmail}</strong>.</p><p>Click the link below to confirm. We'll then send a final link to the new address.</p><p><a href="${url}">${url}</a></p><p>If you didn't request this, ignore this email.</p>`,
					});
				},
			},
		},
		databaseHooks: {
			user: {
				create: {
					// The single admin signs up through the setup wizard with no
					// verification email. Left unverified, Better Auth's magic-link
					// verify would treat the account as unproven and delete its password
					// and sessions on first use. Sign-up is closed after the first user
					// (server middleware + the 0007 DB trigger), so this only ever
					// applies to the admin.
					before: async (user) => ({ data: { ...user, emailVerified: true } }),
				},
			},
			session: {
				create: {
					// Backstop for magic links issued before 2FA was turned on: refuse
					// to mint a session that would skip the second factor.
					before: async (session, ctx) => {
						if (ctx?.path !== "/magic-link/verify") return;
						const found = await ctx.context.internalAdapter.findUserById(session.userId);
						if ((found as { twoFactorEnabled?: boolean | null } | null)?.twoFactorEnabled) {
							return false;
						}
					},
				},
			},
		},
		// Signed-cookie session cache for reads; see the revocation trade-off
		// above and why mutations bypass it.
		session: sessionOptions,
		secret: deps.secret,
		baseURL: deps.baseURL,
		// Better Auth only turns its limiter on when NODE_ENV === "production",
		// which Workers never set. Enable it explicitly: it adds per-route limits
		// (2FA verify, sign-in, change-email) on top of the Cloudflare RL bindings.
		rateLimit: { enabled: true },
		advanced: {
			// On Cloudflare Workers the real client IP is in cf-connecting-ip; the
			// default x-forwarded-for is client-spoofable. Point Better Auth's IP
			// resolution (used for rate-limit / security features) at the trusted header.
			ipAddress: {
				ipAddressHeaders: ["cf-connecting-ip"],
			},
			defaultCookieAttributes: cookieAttributes(deps.baseURL),
		},
		hooks: {
			before: createAuthMiddleware(async (ctx) => {
				// Better Auth runs the change-email senders as background tasks and
				// swallows their errors, so an unconfigured mailer would still answer
				// "sent". The admin started this flow (no enumeration risk): say so.
				if (ctx.path === "/change-email") {
					if (!(await deps.isEmailConfigured())) {
						throw new APIError("BAD_REQUEST", { message: EMAIL_NOT_CONFIGURED_MESSAGE });
					}
					return;
				}
				// Runs before the magic-link endpoint stores a verification token, so a
				// disabled feature or a stranger's address never creates a row or an
				// email (the endpoint would otherwise mail any address it is given).
				if (ctx.path !== "/sign-in/magic-link") return;
				await assertMagicLinkEnabled(db);
				// Depends only on configuration, so it reveals nothing about accounts.
				// Without it the flag-on, key-removed case would answer "link sent".
				if (!(await deps.isEmailConfigured())) {
					throw new APIError("BAD_REQUEST", { message: EMAIL_NOT_CONFIGURED_MESSAGE });
				}
				if (!(await isMagicLinkRecipient(ctx, ctx.body?.email))) {
					// Same answer as a real send: don't reveal which address is the admin's.
					return ctx.json({ status: true });
				}
			}),
		},
		plugins: [
			// DEV ONLY: the bypass-login endpoint (POST /api/auth/dev-login) exists only
			// when DEV_LOGIN === "true" AND the base URL is local http. Otherwise the
			// plugin is unregistered and the route 404s.
			...(isDevLoginEnabled(deps.devLogin, deps.baseURL) ? [devLoginPlugin()] : []),
			// Enabling stores an unverified secret; `twoFactorEnabled` only flips
			// after the first TOTP code verifies, so a half-finished setup can't
			// lock the admin out. The login page answers `twoFactorRedirect` with
			// the TOTP / backup-code step.
			twoFactor({ issuer: "LinkDen" }),
			magicLink({
				// Single admin: never create an account from a magic link.
				disableSignUp: true,
				expiresIn: MAGIC_LINK_EXPIRES_IN_SECONDS,
				sendMagicLink: async ({ email, url }, ctx) => {
					// Belt and braces: the before-hook already refused a disabled feature
					// and answered for anyone else.
					await assertMagicLinkEnabled(db);
					if (!ctx || !(await isMagicLinkRecipient(ctx, email))) return;
					await sendEmail({
						to: email,
						subject: "Sign in to LinkDen",
						html: `<p>Click the link below to sign in to your LinkDen admin panel:</p><p><a href="${url}">${url}</a></p><p>This link expires in ${MAGIC_LINK_EXPIRES_IN_SECONDS / 60} minutes.</p>`,
					});
				},
			}),
		],
	} satisfies BetterAuthOptions;
}

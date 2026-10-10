import { db } from "@linkden/db";
import {
	block,
	contactSubmission,
	linkClick,
	pageView,
	socialNetwork,
	user,
} from "@linkden/db/schema/index";
import { createResendEmailService, renderContactNotification } from "@linkden/email";
import { env } from "@linkden/env/server";
import { socialBrandMap } from "@linkden/ui/social-brands";
import { contactSubmissionSchema } from "@linkden/validators/blocks";
import { TRPCError } from "@trpc/server";
import { asc, eq } from "drizzle-orm";
import { z } from "zod";
import { publicProcedure, router } from "../index";
import { logAudit } from "../utils/audit";
import { CAPTCHA_VERIFY_URLS, type CaptchaProvider, verifyCaptcha } from "../utils/captcha";
import { resolveDeliveryMode } from "../utils/contact-delivery";
import { EMAIL_TRANSPORT_SETTING_KEYS, resolveEmailTransport } from "../utils/email";
import { ownHostnames, referrerHost, requestMeta } from "../utils/request-meta";
import { stripHtml } from "../utils/sanitize";
import { publicBlockWhere } from "../utils/schedule";
import { buildSettingsMap, settingsQuery, toSettingsMap } from "../utils/settings";
import { hasVcardContent, safeParseVcardData } from "./vcard";

// Fail closed: without a parseable site origin a token's hostname can't be
// checked, so CAPTCHA is treated as misconfigured rather than skipped.
function expectedCaptchaHostname(): string {
	try {
		return new URL(env.CORS_ORIGIN).hostname;
	} catch {
		throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "CAPTCHA is misconfigured" });
	}
}

// Settings getPage actually returns. Read by key so a page view never pulls the
// secret rows (wallet signer key, API keys) or large unused blobs out of D1.
export const PUBLIC_PAGE_SETTING_KEYS = [
	"profile_name",
	"avatar_url",
	"bio",
	"verified_badge",
	"theme",
	"theme_preset",
	"custom_primary",
	"custom_secondary",
	"custom_accent",
	"custom_background",
	"custom_css",
	"social_icon_shape",
	"default_color_mode",
	"seo_title",
	"seo_description",
	"seo_og_image",
	"seo_og_mode",
	"seo_og_template",
	"site_language",
	"branding_enabled",
	"branding_text",
	"branding_link",
	"branding_logo_url",
	"branding_favicon_url",
	"branding_site_name",
	"branding_pp_url",
	"branding_pp_mode",
	"branding_pp_text",
	"branding_tos_url",
	"branding_tos_mode",
	"branding_tos_text",
	"banner_preset",
	"banner_enabled",
	"banner_mode",
	"banner_custom_url",
	"vcard_enabled",
	"vcard_data",
	"contact_form_enabled",
	"captcha_provider",
	"captcha_site_key",
	"consent_banner_enabled",
	"consent_banner_text",
	"consent_privacy_url",
	"consent_categories",
] as const;

// Email keys are read only to report `emailConfigured`; their values never leave.
const SETUP_STATUS_SETTING_KEYS = [
	"magic_link_enabled",
	...EMAIL_TRANSPORT_SETTING_KEYS,
	"branding_logo_url",
	"branding_site_name",
	"branding_pp_url",
	"branding_tos_url",
	"branding_pp_mode",
	"branding_pp_text",
	"branding_tos_mode",
	"branding_tos_text",
	"branding_login_logo_url",
	"branding_login_bg_mode",
	"branding_login_bg_preset",
	"branding_login_bg_custom_url",
] as const;

const CONTACT_SETTING_KEYS = [
	"contact_form_enabled",
	"captcha_provider",
	"captcha_secret_key",
	"contact_delivery",
	"email_provider",
	"email_api_key",
	"email_from",
] as const;

/** The configured provider when it is one we can verify, else "none". */
function publicCaptchaProvider(value: string | undefined): CaptchaProvider | "none" {
	return value && Object.hasOwn(CAPTCHA_VERIFY_URLS, value) ? (value as CaptchaProvider) : "none";
}

/** Plain-text field: tags stripped, blank → null. */
function optionalText(value: string | undefined): string | null {
	const trimmed = value?.trim();
	return trimmed ? stripHtml(trimmed) : null;
}

type Submission = Omit<typeof contactSubmission.$inferInsert, "id">;

/** One-line JSON log matching the server's error format. Never logs visitor data. */
function logContactFailure(stage: string, reason: string) {
	console.error(JSON.stringify({ level: "error", path: "public.submitContact", stage, reason }));
}

async function storeSubmission(values: Submission): Promise<void> {
	try {
		await db.insert(contactSubmission).values({ id: crypto.randomUUID(), ...values });
	} catch (err) {
		// Drizzle's error message embeds the bound params (the visitor's name,
		// email and message); keep only the driver's reason for the log.
		const reason =
			err instanceof Error && err.cause instanceof Error ? err.cause.message : "unknown";
		throw new TRPCError({
			code: "INTERNAL_SERVER_ERROR",
			message: "Failed to save the submission",
			cause: new Error(`contact_submission insert failed: ${reason}`),
		});
	}
}

/**
 * Email the admin about a submission. Never throws: returns false (after
 * logging and writing an audit entry for the admin) when email is not
 * configured or the send fails, so the caller decides what "delivered" means.
 */
async function notifyAdmin(settings: Record<string, string>, s: Submission): Promise<boolean> {
	const transport = resolveEmailTransport(settings);
	const [admin] = await db.select({ email: user.email }).from(user).limit(1);
	let reason: string;
	if (!transport || !admin?.email) {
		reason = "Email delivery is not configured";
	} else {
		try {
			const html = await renderContactNotification({
				name: s.name,
				email: s.email,
				message: s.message,
				whereMet: s.whereMet,
				blockTitle: s.blockTitle,
			});
			await createResendEmailService(transport.apiKey, transport.from).send({
				to: admin.email,
				subject: `New contact from ${s.name}`,
				html,
			});
			return true;
		} catch (err) {
			reason = err instanceof Error ? err.message : "Failed to send notification email";
		}
	}
	logContactFailure("email", reason);
	await logAudit("contact.email_failed", "contact", undefined, { reason });
	return false;
}

// ─── Public Router ─────────────────────────────────────────────────────────
// These endpoints are unauthenticated — they power the public-facing link page.
// Because they're open to the internet, every input has strict .max() limits to
// prevent payload abuse, and CAPTCHA is enforced when configured. The write
// endpoints are rate limited per procedure (every call in a batch counts) by
// the tRPC guard in apps/server/src/index.ts.
//
// getPage: Assembles the full public page in one D1 round trip (profile,
//   blocks, social networks, public settings). Blocks are filtered by status
//   and schedule in SQL (publicBlockWhere) and by feature flags (e.g. contact
//   form blocks hidden when the form is off). Exposes the CAPTCHA provider and
//   public site key so the contact form can render the widget — never a secret.
//
// submitContact: Public form submission. CAPTCHA (Turnstile / reCAPTCHA /
//   hCaptcha) is verified server-side and fails closed. A hidden honeypot field
//   silently drops bots. Once a submission is saved, an email failure is logged
//   and audited instead of failing the visitor; in email-only mode a failed
//   send falls back to the Inbox so a lead is never dropped.
//
// trackView/trackClick: Lightweight analytics endpoints — fire-and-forget from
//   the client. No auth required so they work for all visitors.

export const publicRouter = router({
	getPage: publicProcedure.query(async () => {
		const now = new Date();
		const [profiles, pageBlocks, activeSocials, settingRows] = await db.batch([
			db.select({ name: user.name, image: user.image }).from(user).limit(1),
			db
				.select()
				.from(block)
				.where(publicBlockWhere(now))
				// Ties (equal positions) need a stable order or they interleave.
				.orderBy(asc(block.position), asc(block.createdAt), asc(block.id)),
			// Active social networks — resolved against the icon catalog for
			// name/hex/svgPath. social.list is a protected procedure, so the public
			// page can't use it; this mirrors it for anonymous visitors (unknown
			// slugs are dropped).
			db
				.select()
				.from(socialNetwork)
				.where(eq(socialNetwork.isActive, true))
				.orderBy(asc(socialNetwork.addedAt)),
			settingsQuery(PUBLIC_PAGE_SETTING_KEYS),
		]);
		const profile = profiles[0];
		const settings = toSettingsMap(settingRows);

		const socialNetworks = activeSocials.flatMap((s) => {
			const brand = socialBrandMap.get(s.slug);
			if (!brand) return [];
			return [
				{
					slug: s.slug,
					name: brand.name,
					url: s.url,
					hex: brand.hex,
					svgPath: brand.svgPath,
				},
			];
		});

		// Hide blocks for disabled features
		const visibleBlocks = pageBlocks.filter((b) => {
			if (b.type === "connect" && settings.contact_form_enabled !== "true") return false;
			if (b.type === "vcard" && settings.vcard_enabled !== "true") return false;
			return true;
		});

		// Parse theme
		let theme = null;
		try {
			theme = settings.theme ? JSON.parse(settings.theme) : null;
		} catch {
			theme = null;
		}

		// The footer "Save vCard" pill shows only when /api/vcard (no block id)
		// has a card to serve: a visible vCard block with content, else the
		// global vCard. Same rule as resolvePublicVcard.
		const vcardDownloadAvailable =
			settings.vcard_enabled === "true" &&
			(visibleBlocks.some(
				(b) => b.type === "vcard" && hasVcardContent(safeParseVcardData(b.config)),
			) ||
				hasVcardContent(safeParseVcardData(settings.vcard_data)));

		const captchaProvider = publicCaptchaProvider(settings.captcha_provider);
		// Legal documents: a link only in URL mode, the text only in text mode, so
		// switching modes can never leave a stale link behind.
		const ppMode = settings.branding_pp_mode === "text" ? "text" : "url";
		const tosMode = settings.branding_tos_mode === "text" ? "text" : "url";
		const ppUrl = ppMode === "url" ? settings.branding_pp_url || null : null;

		return {
			profile: profile
				? {
						name: settings.profile_name || profile.name,
						image: settings.avatar_url || profile.image,
						bio: settings.bio || null,
						isVerified: settings.verified_badge === "true",
					}
				: null,
			blocks: visibleBlocks,
			socialNetworks,
			theme,
			settings: {
				seoTitle: settings.seo_title || null,
				seoDescription: settings.seo_description || null,
				seoOgImage: settings.seo_og_image || null,
				seoOgMode: settings.seo_og_mode || null,
				seoOgTemplate: settings.seo_og_template || null,
				brandingEnabled: settings.branding_enabled !== "false",
				brandingText: settings.branding_text || "Powered by LinkDen · by MrDemonWolf, Inc.",
				// http(s) only: the registry's url sanitizer guards every write.
				brandingLink: settings.branding_link || null,
				defaultColorMode: settings.default_color_mode || "system",
				vcardEnabled: settings.vcard_enabled === "true",
				vcardDownloadAvailable,
				contactFormEnabled: settings.contact_form_enabled === "true",
				captchaProvider,
				captchaSiteKey: captchaProvider !== "none" ? settings.captcha_site_key || null : null,
				bannerPreset: settings.banner_preset || null,
				bannerEnabled: settings.banner_enabled === "true",
				bannerMode: (settings.banner_mode as "preset" | "custom") || "preset",
				bannerCustomUrl: settings.banner_custom_url || null,
				themePreset: settings.theme_preset || "default",
				customPrimary: settings.custom_primary || null,
				customSecondary: settings.custom_secondary || null,
				customAccent: settings.custom_accent || null,
				customBackground: settings.custom_background || null,
				customCss: settings.custom_css || null,
				socialIconShape: (settings.social_icon_shape as "circle" | "rounded-square") || null,
				brandingLogoUrl: settings.branding_logo_url || null,
				brandingFaviconUrl: settings.branding_favicon_url || null,
				brandingSiteName: settings.branding_site_name || null,
				brandingPpUrl: ppUrl,
				brandingTosUrl: tosMode === "url" ? settings.branding_tos_url || null : null,
				brandingPpMode: ppMode,
				brandingPpText: ppMode === "text" ? settings.branding_pp_text || null : null,
				brandingTosMode: tosMode,
				brandingTosText: tosMode === "text" ? settings.branding_tos_text || null : null,
				consentBannerEnabled: settings.consent_banner_enabled !== "false",
				consentBannerText: settings.consent_banner_text || null,
				// One privacy-notice source: the banner falls back to the branding link.
				consentPrivacyUrl: settings.consent_privacy_url || ppUrl,
				consentCategories: settings.consent_categories || null,
				/** BCP-47 page language; null = English. */
				siteLanguage: settings.site_language || null,
			},
		};
	}),

	// Connect With Me form — input limits prevent payload abuse from unauthenticated users.
	// `whereMet` is optional: the block's showWhereMet toggle decides whether
	// the form asks for it.
	submitContact: publicProcedure.input(contactSubmissionSchema).mutation(async ({ input, ctx }) => {
		const settings = await buildSettingsMap(CONTACT_SETTING_KEYS);
		if (settings.contact_form_enabled !== "true") {
			throw new TRPCError({ code: "FORBIDDEN", message: "Contact form is disabled" });
		}

		// A filled honeypot gets the same success response, but nothing is
		// stored or emailed.
		if (input.website) return { success: true };

		const provider = settings.captcha_provider;
		if (provider && provider !== "none") {
			const { ip } = requestMeta(ctx.headers);
			await verifyCaptcha({
				provider,
				secret: settings.captcha_secret_key || "",
				token: input.captchaToken,
				remoteip: ip || undefined,
				expectedHostname: expectedCaptchaHostname(),
			});
		}

		// Tags are stripped as defence in depth (every sink escapes anyway).
		const submission: Submission = {
			name: stripHtml(`${input.firstName} ${input.lastName}`),
			email: input.email,
			message: input.message ? stripHtml(input.message) : "",
			whereMet: optionalText(input.whereMet),
			blockId: input.blockId ?? null,
			blockTitle: optionalText(input.blockTitle),
		};

		const { wantDb, wantEmail } = resolveDeliveryMode(settings.contact_delivery);
		// Persist first so a later email failure never drops the submission.
		if (wantDb) await storeSubmission(submission);
		if (wantEmail) {
			const emailed = await notifyAdmin(settings, submission);
			// Email-only mode: a failed send falls back to the Inbox rather than
			// losing the lead. The visitor's message was received either way.
			if (!emailed && !wantDb) await storeSubmission(submission);
		}

		return { success: true };
	}),

	// Analytics tracking — country is derived from trusted Cloudflare request
	// headers. The referrer is the one client-supplied field (the page's
	// `document.referrer`; the request's own Referer is the link page itself),
	// stored as a hostname only. The user agent is not collected.
	trackView: publicProcedure
		.input(z.object({ referrer: z.string().max(2048).optional() }).optional())
		.mutation(async ({ input, ctx }) => {
			await db.insert(pageView).values({
				id: crypto.randomUUID(),
				referrer: referrerHost(input?.referrer, ownHostnames(ctx.headers, env.CORS_ORIGIN)),
				country: requestMeta(ctx.headers).country,
			});
			return { success: true };
		}),

	trackClick: publicProcedure
		.input(z.object({ blockId: z.string().max(100), referrer: z.string().max(2048).optional() }))
		.mutation(async ({ input, ctx }) => {
			// Only record clicks for blocks that actually exist — prevents anyone
			// from polluting stats or creating orphan rows with arbitrary ids.
			const [target] = await db
				.select({ id: block.id })
				.from(block)
				.where(eq(block.id, input.blockId));
			if (!target) return { success: true };

			await db.insert(linkClick).values({
				id: crypto.randomUUID(),
				blockId: input.blockId,
				referrer: referrerHost(input.referrer, ownHostnames(ctx.headers, env.CORS_ORIGIN)),
				country: requestMeta(ctx.headers).country,
			});
			return { success: true };
		}),

	hasUsers: publicProcedure.query(async () => {
		const [existingUser] = await db.select({ id: user.id }).from(user).limit(1);
		return { hasUsers: !!existingUser };
	}),

	getSetupStatus: publicProcedure.query(async () => {
		const [existingUser] = await db
			.select({ id: user.id, twoFactorEnabled: user.twoFactorEnabled })
			.from(user)
			.limit(1);

		const s = await buildSettingsMap(SETUP_STATUS_SETTING_KEYS);
		// Only the boolean is exposed — never the provider, key or sender.
		const emailConfigured = resolveEmailTransport(s) !== null;

		return {
			completed: !!existingUser,
			emailConfigured,
			// The auth layer silently refuses to mail a link while 2FA is on (a
			// link would skip the second factor) or when email can't be sent, so
			// the login page must not offer a button that can only say "check
			// your inbox".
			magicLinkEnabled:
				s.magic_link_enabled === "true" && emailConfigured && !existingUser?.twoFactorEnabled,
			branding: {
				logoUrl: s.branding_logo_url || null,
				siteName: s.branding_site_name || null,
				ppUrl: s.branding_pp_url || null,
				tosUrl: s.branding_tos_url || null,
				ppMode: (s.branding_pp_mode as "url" | "text") || "url",
				ppText: s.branding_pp_text || null,
				tosMode: (s.branding_tos_mode as "url" | "text") || "url",
				tosText: s.branding_tos_text || null,
				loginLogoUrl: s.branding_login_logo_url || null,
				loginBgMode: (s.branding_login_bg_mode as "default" | "preset" | "custom") || "default",
				loginBgPreset: s.branding_login_bg_preset || null,
				loginBgCustomUrl: s.branding_login_bg_custom_url || null,
			},
		};
	}),
});

import { db } from "@linkden/db";
import {
	block,
	contactSubmission,
	linkClick,
	pageView,
	siteSettings,
	socialNetwork,
	user,
} from "@linkden/db/schema/index";
import { socialBrandMap } from "@linkden/ui/social-brands";
import { TRPCError } from "@trpc/server";
import { and, asc, eq } from "drizzle-orm";
import { z } from "zod";
import { publicProcedure, router } from "../index";
import { stripHtml, truncateUserAgent } from "../utils/sanitize";
import { buildSettingsMap } from "../utils/settings";
import { generateVCardString, vcardDataSchema } from "./vcard";

// ─── Public Router ─────────────────────────────────────────────────────────
// These endpoints are unauthenticated — they power the public-facing link page.
// Because they're open to the internet, every input has strict .max() limits to
// prevent payload abuse, and CAPTCHA is enforced when configured.
//
// getPage: Assembles the full public page in a single query (profile, blocks,
//   social networks, theme, settings). Blocks are filtered by schedule, enabled
//   status, and feature flags (e.g. contact form blocks hidden when form is off).
//
// submitContact: Public form submission with CAPTCHA validation. Supports both
//   Cloudflare Turnstile and Google reCAPTCHA. All text inputs are HTML-stripped
//   to prevent stored XSS.
//
// trackView/trackClick: Lightweight analytics endpoints — fire-and-forget from
//   the client. No auth required so they work for all visitors.

export const publicRouter = router({
	getPage: publicProcedure.query(async () => {
		const [profile] = await db.select().from(user).limit(1);

		const now = new Date();
		const allBlocks = await db
			.select()
			.from(block)
			.where(and(eq(block.isEnabled, true), eq(block.status, "published")))
			.orderBy(asc(block.position));

		// Filter blocks by schedule
		const scheduledBlocks = allBlocks.filter((b) => {
			if (b.scheduledStart && new Date(b.scheduledStart) > now) return false;
			if (b.scheduledEnd && new Date(b.scheduledEnd) < now) return false;
			return true;
		});

		// Active social networks — resolved against the icon catalog for name/hex/svgPath.
		// social.list is a protected procedure, so the public page can't use it; this
		// mirrors it for anonymous visitors (unknown slugs are dropped).
		const activeSocials = await db
			.select()
			.from(socialNetwork)
			.where(eq(socialNetwork.isActive, true))
			.orderBy(asc(socialNetwork.addedAt));

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

		// Get all settings at once
		const settings = await buildSettingsMap();

		// Hide blocks for disabled features
		const visibleBlocks = scheduledBlocks.filter((b) => {
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

		return {
			profile: profile
				? {
						name: profile.name,
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
				brandingText: settings.branding_text || "Powered by LinkDen made by MrDemonWolf, Inc.",
				defaultColorMode: settings.default_color_mode || "system",
				walletPassEnabled: settings.wallet_pass_enabled === "true",
				vcardEnabled: settings.vcard_enabled === "true",
				contactFormEnabled: settings.contact_form_enabled === "true",
				captchaProvider: settings.captcha_provider || "none",
				captchaSiteKey: settings.captcha_site_key || null,
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
				brandingPpUrl: settings.branding_pp_url || null,
				brandingTosUrl: settings.branding_tos_url || null,
				brandingPpMode: (settings.branding_pp_mode as "url" | "text") || "url",
				brandingPpText: settings.branding_pp_text || null,
				brandingTosMode: (settings.branding_tos_mode as "url" | "text") || "url",
				brandingTosText: settings.branding_tos_text || null,
				consentBannerEnabled: settings.consent_banner_enabled !== "false",
				consentBannerText: settings.consent_banner_text || null,
				consentPrivacyUrl: settings.consent_privacy_url || null,
				consentCategories: settings.consent_categories || null,
			},
		};
	}),

	// Connect With Me form — input limits prevent payload abuse from unauthenticated users
	submitContact: publicProcedure
		.input(
			z.object({
				firstName: z.string().min(1).max(50),
				lastName: z.string().min(1).max(50),
				email: z.string().email().max(254),
				whereMet: z.string().max(200),
				message: z.string().max(5000).optional(),
				captchaToken: z.string().max(4096).optional(),
				blockId: z.string().max(100).optional(),
				blockTitle: z.string().max(200).optional(),
				consent: z.literal(true, { error: "Consent is required" }),
			}),
		)
		.mutation(async ({ input }) => {
			// Check if contact form is enabled
			const [contactEnabled] = await db
				.select()
				.from(siteSettings)
				.where(eq(siteSettings.key, "contact_form_enabled"));
			if (contactEnabled?.value !== "true") {
				throw new TRPCError({ code: "FORBIDDEN", message: "Contact form is disabled" });
			}

			// Validate CAPTCHA if configured
			const [captchaProvider] = await db
				.select()
				.from(siteSettings)
				.where(eq(siteSettings.key, "captcha_provider"));
			const [captchaSecret] = await db
				.select()
				.from(siteSettings)
				.where(eq(siteSettings.key, "captcha_secret_key"));

			if (captchaProvider?.value && captchaProvider.value !== "none") {
				if (!input.captchaToken) {
					throw new TRPCError({ code: "BAD_REQUEST", message: "CAPTCHA verification required" });
				}

				let verifyUrl: string;
				if (captchaProvider.value === "turnstile") {
					verifyUrl = "https://challenges.cloudflare.com/turnstile/v0/siteverify";
				} else {
					verifyUrl = "https://www.google.com/recaptcha/api/siteverify";
				}

				const verifyResponse = await fetch(verifyUrl, {
					method: "POST",
					headers: { "Content-Type": "application/x-www-form-urlencoded" },
					body: new URLSearchParams({
						secret: captchaSecret?.value || "",
						response: input.captchaToken,
					}),
				});

				const verifyData = (await verifyResponse.json()) as {
					success: boolean;
				};
				if (!verifyData.success) {
					throw new TRPCError({ code: "BAD_REQUEST", message: "CAPTCHA verification failed" });
				}
			}

			// Sanitize user content to prevent stored XSS

			const id = crypto.randomUUID();
			await db.insert(contactSubmission).values({
				id,
				name: stripHtml(`${input.firstName} ${input.lastName}`),
				email: input.email,
				message: input.message ? stripHtml(input.message) : "",
				whereMet: stripHtml(input.whereMet),
				blockId: input.blockId ?? null,
				blockTitle: input.blockTitle ? stripHtml(input.blockTitle) : null,
			});

			return { success: true };
		}),

	// Analytics tracking — inputs are capped to prevent oversized payloads from anonymous visitors
	trackView: publicProcedure
		.input(
			z.object({
				referrer: z.string().max(2048).optional(),
				userAgent: z.string().max(500).optional(),
				country: z.string().max(10).optional(),
			}),
		)
		.mutation(async ({ input }) => {
			const id = crypto.randomUUID();
			await db.insert(pageView).values({
				id,
				referrer: input.referrer ?? null,
				userAgent: truncateUserAgent(input.userAgent),
				country: input.country ?? null,
			});
			return { success: true };
		}),

	trackClick: publicProcedure
		.input(
			z.object({
				blockId: z.string().max(100),
				referrer: z.string().max(2048).optional(),
				userAgent: z.string().max(500).optional(),
				country: z.string().max(10).optional(),
			}),
		)
		.mutation(async ({ input }) => {
			const id = crypto.randomUUID();
			await db.insert(linkClick).values({
				id,
				blockId: input.blockId,
				referrer: input.referrer ?? null,
				userAgent: truncateUserAgent(input.userAgent),
				country: input.country ?? null,
			});
			return { success: true };
		}),

	getVCard: publicProcedure.query(async () => {
		// Check global vcard setting
		const [vcardSetting] = await db
			.select()
			.from(siteSettings)
			.where(eq(siteSettings.key, "vcard_enabled"));
		if (vcardSetting?.value !== "true") {
			return { enabled: false, vcardString: null };
		}

		const [vcardBlock] = await db
			.select()
			.from(block)
			.where(and(eq(block.type, "vcard"), eq(block.isEnabled, true), eq(block.status, "published")))
			.orderBy(asc(block.position))
			.limit(1);

		if (!vcardBlock) {
			return { enabled: false, vcardString: null };
		}

		let config = {};
		try {
			config = vcardBlock.config ? JSON.parse(vcardBlock.config) : {};
		} catch {
			// Corrupted JSON in block config — return empty vcard rather than crashing
			return { enabled: false, vcardString: null };
		}
		const result = vcardDataSchema.safeParse(config);
		if (!result.success) {
			return { enabled: false, vcardString: null };
		}
		return { enabled: true, vcardString: generateVCardString(result.data) };
	}),

	getBranding: publicProcedure.query(async () => {
		const settings = await buildSettingsMap();
		return {
			logoUrl: settings.branding_logo_url || null,
			siteName: settings.branding_site_name || null,
			ppUrl: settings.branding_pp_url || null,
			tosUrl: settings.branding_tos_url || null,
			ppMode: (settings.branding_pp_mode as "url" | "text") || "url",
			ppText: settings.branding_pp_text || null,
			tosMode: (settings.branding_tos_mode as "url" | "text") || "url",
			tosText: settings.branding_tos_text || null,
			loginLogoUrl: settings.branding_login_logo_url || null,
			loginBgMode:
				(settings.branding_login_bg_mode as "default" | "preset" | "custom") || "default",
			loginBgPreset: settings.branding_login_bg_preset || null,
			loginBgCustomUrl: settings.branding_login_bg_custom_url || null,
		};
	}),

	hasUsers: publicProcedure.query(async () => {
		const [existingUser] = await db.select({ id: user.id }).from(user).limit(1);
		return { hasUsers: !!existingUser };
	}),

	getSetupStatus: publicProcedure.query(async () => {
		const [existingUser] = await db.select({ id: user.id }).from(user).limit(1);

		const s = await buildSettingsMap();

		return {
			completed: !!existingUser,
			magicLinkEnabled: s.magic_link_enabled === "true",
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

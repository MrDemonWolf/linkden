import { router, publicProcedure } from "../index";
import { db } from "@linkden/db";
import {
	user,
	block,
	siteSettings,
	contactSubmission,
	pageView,
	linkClick,
	socialNetwork,
} from "@linkden/db/schema/index";
import { eq, asc, and } from "drizzle-orm";
import { z } from "zod";
import { generateVCardString, vcardDataSchema } from "./vcard";

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

		// Get all settings at once
		const settingsRows = await db.select().from(siteSettings);
		const settings: Record<string, string> = {};
		for (const row of settingsRows) {
			settings[row.key] = row.value;
		}

		// Get active social networks with URLs
		const activeSocials = await db
			.select()
			.from(socialNetwork)
			.where(and(eq(socialNetwork.isActive, true)));

		const socialNetworks = activeSocials
			.filter((s) => s.url)
			.map((s) => ({
				slug: s.slug,
				name: s.name,
				url: s.url!,
				hex: s.hex,
				svgPath: s.svgPath,
			}));

		// Hide blocks for disabled features
		const visibleBlocks = scheduledBlocks.filter((b) => {
			if (b.type === "contact_form" && settings.contact_form_enabled !== "true") return false;
			if (b.type === "social_icons" && socialNetworks.length === 0) return false;
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
						email: profile.email,
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
				brandingEnabled: settings.branding_enabled !== "false",
				brandingText:
					settings.branding_text ||
					"Powered by LinkDen made by MrDemonWolf, Inc.",
				defaultColorMode: settings.default_color_mode || "system",
				walletPassEnabled: settings.wallet_pass_enabled === "true",
				vcardEnabled: settings.vcard_enabled === "true",
				contactFormEnabled: settings.contact_form_enabled === "true",
				captchaProvider: settings.captcha_provider || "none",
				captchaSiteKey: settings.captcha_site_key || null,
				bannerPreset: settings.banner_preset || null,
				bannerEnabled: settings.banner_enabled === "true",
				themePreset: settings.theme_preset || "default",
				customCss: settings.custom_css || null,
			},
		};
	}),

	submitContact: publicProcedure
		.input(
			z.object({
				name: z.string().min(1),
				email: z.string().email(),
				message: z.string().min(1),
				phone: z.string().optional(),
				subject: z.string().optional(),
				company: z.string().optional(),
				captchaToken: z.string().optional(),
			}),
		)
		.mutation(async ({ input }) => {
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
					throw new Error("CAPTCHA verification required");
				}

				let verifyUrl: string;
				if (captchaProvider.value === "turnstile") {
					verifyUrl =
						"https://challenges.cloudflare.com/turnstile/v0/siteverify";
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
					throw new Error("CAPTCHA verification failed");
				}
			}

			const id = crypto.randomUUID();
			await db.insert(contactSubmission).values({
				id,
				name: input.name,
				email: input.email,
				message: input.message,
				phone: input.phone ?? null,
				subject: input.subject ?? null,
				company: input.company ?? null,
			});

			return { success: true };
		}),

	trackView: publicProcedure
		.input(
			z.object({
				referrer: z.string().optional(),
				userAgent: z.string().optional(),
				country: z.string().optional(),
			}),
		)
		.mutation(async ({ input }) => {
			const id = crypto.randomUUID();
			await db.insert(pageView).values({
				id,
				referrer: input.referrer ?? null,
				userAgent: input.userAgent ?? null,
				country: input.country ?? null,
			});
			return { success: true };
		}),

	trackClick: publicProcedure
		.input(
			z.object({
				blockId: z.string(),
				referrer: z.string().optional(),
				userAgent: z.string().optional(),
				country: z.string().optional(),
			}),
		)
		.mutation(async ({ input }) => {
			const id = crypto.randomUUID();
			await db.insert(linkClick).values({
				id,
				blockId: input.blockId,
				referrer: input.referrer ?? null,
				userAgent: input.userAgent ?? null,
				country: input.country ?? null,
			});
			return { success: true };
		}),

	getVCard: publicProcedure.query(async () => {
		const [enabledSetting] = await db
			.select()
			.from(siteSettings)
			.where(eq(siteSettings.key, "vcard_enabled"));

		if (enabledSetting?.value !== "true") {
			return { enabled: false, vcardString: null };
		}

		const [dataSetting] = await db
			.select()
			.from(siteSettings)
			.where(eq(siteSettings.key, "vcard_data"));

		if (!dataSetting) {
			return { enabled: true, vcardString: null };
		}

		const data = vcardDataSchema.parse(JSON.parse(dataSetting.value));
		return { enabled: true, vcardString: generateVCardString(data) };
	}),

	getSetupStatus: publicProcedure.query(async () => {
		const [setting] = await db
			.select()
			.from(siteSettings)
			.where(eq(siteSettings.key, "setup_completed"));
		return { completed: setting?.value === "true" };
	}),
});

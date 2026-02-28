import { router, protectedProcedure } from "../index";
import { db } from "@linkden/db";
import { siteSettings } from "@linkden/db/schema/index";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { invalidateSetupToken } from "./public";

// Sanitization utilities
function stripHtmlTags(str: string): string {
	return str.replace(/<[^>]*>/g, "");
}

function isValidUrl(url: string): boolean {
	if (!url) return true;
	try {
		const parsed = new URL(url);
		return parsed.protocol === "http:" || parsed.protocol === "https:";
	} catch {
		return false;
	}
}

function isValidHexColor(color: string): boolean {
	return /^#[0-9A-Fa-f]{6}$/.test(color);
}

function sanitizeCss(css: string): string {
	// Strip known CSS injection vectors
	return css
		.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
		.replace(/<[^>]*>/g, "")
		.replace(/expression\s*\(/gi, "")
		.replace(/url\s*\(\s*['"]?\s*javascript:/gi, "url(")
		.replace(/@import\s+url\s*\(\s*['"]?\s*javascript:/gi, "")
		.replace(/behavior\s*:/gi, "")
		.replace(/-moz-binding\s*:/gi, "");
}

// Keys that should be sanitized as plain text (no HTML)
const TEXT_KEYS = ["profile_name", "bio", "branding_text", "seo_title", "seo_description", "seo_og_mode", "seo_og_template"];
// Keys that should be validated as URLs
const URL_KEYS = ["branding_link", "seo_og_image", "avatar_url", "banner_custom_url"];
// Keys that should be validated as hex colors
const COLOR_KEYS = ["custom_primary", "custom_secondary", "custom_accent", "custom_background"];
// Keys with length limits
const LENGTH_LIMITS: Record<string, number> = {
	profile_name: 50,
	bio: 300,
	branding_text: 100,
	seo_title: 100,
	seo_description: 250,
};

function sanitizeSetting(key: string, value: string): string {
	if (TEXT_KEYS.includes(key)) {
		let sanitized = stripHtmlTags(value);
		const limit = LENGTH_LIMITS[key];
		if (limit && sanitized.length > limit) {
			sanitized = sanitized.slice(0, limit);
		}
		return sanitized;
	}
	if (URL_KEYS.includes(key)) {
		if (value && !isValidUrl(value)) {
			throw new Error(`Invalid URL for ${key}`);
		}
		return value;
	}
	if (COLOR_KEYS.includes(key)) {
		if (value && !isValidHexColor(value)) {
			throw new Error(`Invalid color for ${key}: must be #RRGGBB`);
		}
		return value;
	}
	if (key === "custom_css") {
		return sanitizeCss(value);
	}
	return value;
}

export const settingsRouter = router({
	get: protectedProcedure
		.input(z.object({ key: z.string() }))
		.query(async ({ input }) => {
			const [result] = await db
				.select()
				.from(siteSettings)
				.where(eq(siteSettings.key, input.key));
			return result ?? null;
		}),

	getAll: protectedProcedure.query(async () => {
		const results = await db.select().from(siteSettings);
		const map: Record<string, string> = {};
		for (const row of results) {
			map[row.key] = row.value;
		}
		return map;
	}),

	update: protectedProcedure
		.input(
			z.object({
				key: z.string(),
				value: z.string(),
			}),
		)
		.mutation(async ({ input }) => {
			const sanitizedValue = sanitizeSetting(input.key, input.value);
			const [existing] = await db
				.select()
				.from(siteSettings)
				.where(eq(siteSettings.key, input.key));

			if (existing) {
				await db
					.update(siteSettings)
					.set({ value: sanitizedValue })
					.where(eq(siteSettings.key, input.key));
			} else {
				await db.insert(siteSettings).values({
					key: input.key,
					value: sanitizedValue,
				});
			}

			if (input.key === "setup_completed" && sanitizedValue === "true") {
				invalidateSetupToken();
			}

			return { success: true };
		}),

	updateBulk: protectedProcedure
		.input(z.array(z.object({ key: z.string(), value: z.string() })))
		.mutation(async ({ input }) => {
			let setupCompleted = false;
			for (const { key, value } of input) {
				const sanitizedValue = sanitizeSetting(key, value);
				const [existing] = await db
					.select()
					.from(siteSettings)
					.where(eq(siteSettings.key, key));

				if (existing) {
					await db
						.update(siteSettings)
						.set({ value: sanitizedValue })
						.where(eq(siteSettings.key, key));
				} else {
					await db.insert(siteSettings).values({ key, value: sanitizedValue });
				}

				if (key === "setup_completed" && sanitizedValue === "true") {
					setupCompleted = true;
				}
			}

			if (setupCompleted) {
				invalidateSetupToken();
			}

			return { success: true };
		}),
});

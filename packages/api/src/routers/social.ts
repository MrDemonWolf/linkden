import { router, protectedProcedure } from "../index";
import { db } from "@linkden/db";
import { socialNetwork } from "@linkden/db/schema/index";
import { eq, asc } from "drizzle-orm";
import { z } from "zod";

// Map our slugs to simple-icons export names (si + PascalCase title)
const CURATED_NETWORKS: Record<string, string> = {
	// Social
	facebook: "siFacebook",
	x: "siX",
	instagram: "siInstagram",
	linkedin: "siLinkedin",
	tiktok: "siTiktok",
	snapchat: "siSnapchat",
	pinterest: "siPinterest",
	tumblr: "siTumblr",
	reddit: "siReddit",
	threads: "siThreads",
	mastodon: "siMastodon",
	bluesky: "siBluesky",
	// Messaging
	discord: "siDiscord",
	telegram: "siTelegram",
	whatsapp: "siWhatsapp",
	signal: "siSignal",
	slack: "siSlack",
	// Content
	youtube: "siYoutube",
	twitch: "siTwitch",
	medium: "siMedium",
	substack: "siSubstack",
	wordpress: "siWordpress",
	blogger: "siBlogger",
	// Developer
	github: "siGithub",
	gitlab: "siGitlab",
	devto: "siDevdotto",
	hashnode: "siHashnode",
	codepen: "siCodepen",
	stackoverflow: "siStackoverflow",
	npm: "siNpm",
	// Business
	patreon: "siPatreon",
	kofi: "siKofi",
	buymeacoffee: "siBuymeacoffee",
	cashapp: "siCashapp",
	venmo: "siVenmo",
	paypal: "siPaypal",
	gumroad: "siGumroad",
	shopify: "siShopify",
	etsy: "siEtsy",
	// Music
	spotify: "siSpotify",
	soundcloud: "siSoundcloud",
	bandcamp: "siBandcamp",
	applemusic: "siApplemusic",
	deezer: "siDeezer",
	tidal: "siTidal",
	// Gaming
	steam: "siSteam",
	playstation: "siPlaystation",
	xbox: "siXbox",
	epicgames: "siEpicgames",
	roblox: "siRoblox",
	// Design
	dribbble: "siDribbble",
	behance: "siBehance",
	figma: "siFigma",
	notion: "siNotion",
};

async function seedFromSimpleIcons() {
	let si: Record<string, { title: string; hex: string; path: string }>;
	try {
		si = await import("simple-icons") as unknown as Record<string, { title: string; hex: string; path: string }>;
	} catch (err) {
		console.error("Failed to import simple-icons:", err);
		return;
	}
	const rows: Array<{
		slug: string;
		name: string;
		hex: string;
		svgPath: string;
		isActive: boolean;
	}> = [];

	for (const [slug, exportName] of Object.entries(CURATED_NETWORKS)) {
		const icon = si[exportName];
		if (!icon) continue;
		rows.push({
			slug,
			name: icon.title,
			hex: `#${icon.hex}`,
			svgPath: icon.path,
			isActive: false,
		});
	}

	if (rows.length > 0) {
		await db.insert(socialNetwork).values(rows).onConflictDoNothing();
	}
}

export const socialRouter = router({
	list: protectedProcedure
		.input(
			z
				.object({
					activeOnly: z.boolean().default(false),
				})
				.optional(),
		)
		.query(async ({ input }) => {
			let results = input?.activeOnly
				? await db
						.select()
						.from(socialNetwork)
						.where(eq(socialNetwork.isActive, true))
						.orderBy(asc(socialNetwork.name))
				: await db
						.select()
						.from(socialNetwork)
						.orderBy(asc(socialNetwork.name));

			// Auto-seed if table is empty
			if (results.length === 0 && !input?.activeOnly) {
				try {
					await seedFromSimpleIcons();
					results = await db
						.select()
						.from(socialNetwork)
						.orderBy(asc(socialNetwork.name));
				} catch (err) {
					console.error("Failed to seed social networks:", err);
				}
			}

			return results;
		}),

	toggle: protectedProcedure
		.input(
			z.object({
				slug: z.string(),
				isActive: z.boolean(),
			}),
		)
		.mutation(async ({ input }) => {
			await db
				.update(socialNetwork)
				.set({ isActive: input.isActive })
				.where(eq(socialNetwork.slug, input.slug));
			return { success: true };
		}),

	updateUrl: protectedProcedure
		.input(
			z.object({
				slug: z.string(),
				url: z.string().url().or(z.literal("")),
			}),
		)
		.mutation(async ({ input }) => {
			await db
				.update(socialNetwork)
				.set({ url: input.url || null })
				.where(eq(socialNetwork.slug, input.slug));
			return { success: true };
		}),

	updateBulk: protectedProcedure
		.input(
			z.array(
				z.object({
					slug: z.string(),
					url: z.string().or(z.literal("")),
					isActive: z.boolean(),
				}),
			),
		)
		.mutation(async ({ input }) => {
			for (const item of input) {
				await db
					.update(socialNetwork)
					.set({
						url: item.url || null,
						isActive: item.isActive,
					})
					.where(eq(socialNetwork.slug, item.slug));
			}
			return { success: true };
		}),
});

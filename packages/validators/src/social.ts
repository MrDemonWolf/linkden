import { z } from "zod";
import { httpUrlSchema } from "./blocks";

// ─── Social networks ─────────────────────────────────────────────────────────
// The slug list is the single source of truth for which networks exist; the
// brand catalogue in packages/ui/src/social-brands.ts is typed against it, so
// adding a network means adding the slug here and the brand entry there.

export const SOCIAL_SLUGS = [
	// Social
	"facebook",
	"x",
	"instagram",
	"linkedin",
	"tiktok",
	"snapchat",
	"pinterest",
	"tumblr",
	"reddit",
	"threads",
	"mastodon",
	"bluesky",
	// Messaging
	"discord",
	"telegram",
	"whatsapp",
	"signal",
	"slack",
	// Content
	"youtube",
	"twitch",
	"medium",
	"substack",
	"wordpress",
	"blogger",
	// Developer
	"github",
	"gitlab",
	"devto",
	"hashnode",
	"codepen",
	"stackoverflow",
	"npm",
	// Business
	"patreon",
	"kofi",
	"buymeacoffee",
	"cashapp",
	"venmo",
	"paypal",
	"gumroad",
	"shopify",
	"etsy",
	// Music
	"spotify",
	"soundcloud",
	"bandcamp",
	"applemusic",
	"deezer",
	"tidal",
	// Gaming
	"steam",
	"playstation",
	"xbox",
	"epicgames",
	"roblox",
	// Design / productivity
	"dribbble",
	"behance",
	"figma",
	"notion",
] as const;

export type SocialSlug = (typeof SOCIAL_SLUGS)[number];

export const socialSlugSchema = z.enum(SOCIAL_SLUGS);

/** One row of social.updateBulk — an empty url clears the network. */
export const socialNetworkUpdateSchema = z.object({
	slug: socialSlugSchema,
	url: httpUrlSchema.or(z.literal("")),
	isActive: z.boolean(),
});

export const updateSocialSchema = z.array(socialNetworkUpdateSchema).max(SOCIAL_SLUGS.length);

export type SocialNetworkUpdate = z.infer<typeof socialNetworkUpdateSchema>;

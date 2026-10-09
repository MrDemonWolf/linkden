// ─── Embed providers ────────────────────────────────────────────────────────
// One registry for every supported embed provider: the URL it accepts, its
// editor placeholder/label, and how to rewrite a user URL into a safe embed
// src. Shared by the public renderer, the admin editor, and server validation
// so the three can never drift. Zod-free on purpose: the public page's embed
// block imports it, and must not pull zod into the page bundle.

export interface EmbedProvider {
	id: string;
	label: string;
	placeholder: string;
	/** A user URL is valid for this provider when it matches. */
	match: RegExp;
	/** Rewrite a valid URL to an embeddable src (null if not extractable). */
	toEmbedSrc: (url: string) => string | null;
}

export const EMBED_PROVIDERS: EmbedProvider[] = [
	{
		id: "youtube",
		label: "YouTube",
		placeholder: "https://youtube.com/watch?v=dQw4w9WgXcQ",
		match: /(?:youtube\.com\/(?:watch|embed)|youtu\.be\/)/i,
		toEmbedSrc(url) {
			const m = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]+)/);
			return m ? `https://www.youtube-nocookie.com/embed/${m[1]}` : null;
		},
	},
	{
		id: "spotify",
		label: "Spotify",
		placeholder: "https://open.spotify.com/track/...",
		match: /open\.spotify\.com\//i,
		toEmbedSrc(url) {
			const m = url.match(/spotify\.com\/(track|album|playlist|episode)\/([a-zA-Z0-9]+)/);
			return m ? `https://open.spotify.com/embed/${m[1]}/${m[2]}` : null;
		},
	},
	{
		id: "soundcloud",
		label: "SoundCloud",
		placeholder: "https://soundcloud.com/artist/track",
		match: /soundcloud\.com\//i,
		toEmbedSrc(url) {
			return `https://w.soundcloud.com/player/?url=${encodeURIComponent(url)}&auto_play=false&visual=true`;
		},
	},
];

export const EMBED_PROVIDER_MAP: Record<string, EmbedProvider> = Object.fromEntries(
	EMBED_PROVIDERS.map((p) => [p.id, p]),
);

/** True when the URL is acceptable for the given embed type (custom = any https/http). */
export function validateEmbedUrl(embedType: string, url: string): boolean {
	if (embedType === "custom") return /^https?:\/\//i.test(url);
	const provider = EMBED_PROVIDER_MAP[embedType];
	return provider ? provider.match.test(url) : true;
}

/**
 * Convert a stored embed URL into a safe iframe src. Known providers are
 * rewritten to their official embed endpoints (safe origin from a regex match);
 * custom/unknown types must be https:, blocking javascript:/data:/http:.
 */
export function getEmbedSrc(embedType: string | null, embedUrl: string | null): string | null {
	if (!embedUrl) return null;
	const provider = embedType ? EMBED_PROVIDER_MAP[embedType] : undefined;
	if (provider) return provider.toEmbedSrc(embedUrl);
	try {
		if (new URL(embedUrl).protocol !== "https:") return null;
	} catch {
		return null;
	}
	return embedUrl;
}

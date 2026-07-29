import { describe, expect, it } from "vitest";
import { getEmbedSrc, validateEmbedUrl } from "../blocks";

describe("validateEmbedUrl", () => {
	it("accepts matching provider URLs", () => {
		expect(validateEmbedUrl("youtube", "https://youtube.com/watch?v=abc")).toBe(true);
		expect(validateEmbedUrl("spotify", "https://open.spotify.com/track/x")).toBe(true);
		expect(validateEmbedUrl("soundcloud", "https://soundcloud.com/a/b")).toBe(true);
	});
	it("rejects mismatched provider URLs", () => {
		expect(validateEmbedUrl("youtube", "https://vimeo.com/1")).toBe(false);
	});
	it("custom accepts any http(s)", () => {
		expect(validateEmbedUrl("custom", "https://example.com")).toBe(true);
		expect(validateEmbedUrl("custom", "ftp://example.com")).toBe(false);
	});
});

describe("getEmbedSrc", () => {
	it("rewrites YouTube to nocookie embed", () => {
		expect(getEmbedSrc("youtube", "https://youtube.com/watch?v=dQw4w9WgXcQ")).toBe(
			"https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ",
		);
		expect(getEmbedSrc("youtube", "https://youtu.be/dQw4w9WgXcQ")).toBe(
			"https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ",
		);
	});
	it("rewrites Spotify to embed path", () => {
		expect(getEmbedSrc("spotify", "https://open.spotify.com/track/abc123")).toBe(
			"https://open.spotify.com/embed/track/abc123",
		);
	});
	it("wraps SoundCloud in the player URL", () => {
		expect(getEmbedSrc("soundcloud", "https://soundcloud.com/a/b")).toContain(
			"w.soundcloud.com/player",
		);
	});
	it("blocks non-https custom embeds (XSS/scheme injection)", () => {
		expect(getEmbedSrc("custom", "javascript:alert(1)")).toBeNull();
		expect(getEmbedSrc("custom", "http://example.com")).toBeNull();
		expect(getEmbedSrc("custom", "https://example.com/e")).toBe("https://example.com/e");
	});
	it("returns null for missing url", () => {
		expect(getEmbedSrc("youtube", null)).toBeNull();
	});
});

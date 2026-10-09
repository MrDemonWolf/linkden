import { validateEmbedUrl as isValidEmbedUrl } from "@linkden/validators/blocks";
import { describe, expect, it } from "vitest";
import { validateEmbedUrl } from "../builder-constants";

describe("editor validateEmbedUrl", () => {
	it("follows the shared provider rule and names the provider", () => {
		const wrong = "https://vimeo.com/123";
		expect(isValidEmbedUrl("youtube", wrong)).toBe(false);
		expect(validateEmbedUrl("youtube", wrong)).toBe("This doesn't look like a YouTube URL");
		expect(validateEmbedUrl("youtube", "https://www.youtube.com/watch?v=abc123")).toBeNull();
	});

	it("leaves custom URLs and empty fields to the URL check", () => {
		expect(validateEmbedUrl("custom", "not a url")).toBeNull();
		expect(validateEmbedUrl("youtube", "")).toBeNull();
		expect(validateEmbedUrl("", "https://vimeo.com/123")).toBeNull();
	});
});

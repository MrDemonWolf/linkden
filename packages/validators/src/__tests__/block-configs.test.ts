import { describe, it, expect } from "vitest";
import {
	linkConfigSchema,
	locationConfigSchema,
	headerConfigSchema,
	blockTypeSchema,
} from "../blocks";

describe("blockTypeSchema", () => {
	it("accepts all valid block types", () => {
		const types = ["link", "header", "social_icons", "embed", "form", "vcard", "location"];
		for (const type of types) {
			expect(blockTypeSchema.parse(type)).toBe(type);
		}
	});

	it("rejects invalid block type", () => {
		expect(() => blockTypeSchema.parse("invalid")).toThrow();
	});
});

describe("linkConfigSchema", () => {
	it("parses valid link config", () => {
		const config = {
			emoji: "🔗",
			emojiPosition: "left" as const,
			textAlign: "center" as const,
			isOutlined: false,
			openInNewTab: true,
			description: "My cool link",
			thumbnail: "https://example.com/thumb.jpg",
			isHighlighted: true,
		};
		const result = linkConfigSchema.parse(config);
		expect(result.description).toBe("My cool link");
		expect(result.thumbnail).toBe("https://example.com/thumb.jpg");
		expect(result.isHighlighted).toBe(true);
	});

	it("accepts empty config", () => {
		const result = linkConfigSchema.parse({});
		expect(result).toBeDefined();
	});

	it("rejects invalid emojiPosition", () => {
		expect(() =>
			linkConfigSchema.parse({ emojiPosition: "top" }),
		).toThrow();
	});

	it("accepts config without new fields (backward compatible)", () => {
		const oldConfig = {
			emoji: "📎",
			isOutlined: true,
			animation: "pulse",
		};
		const result = linkConfigSchema.parse(oldConfig);
		expect(result.description).toBeUndefined();
		expect(result.thumbnail).toBeUndefined();
		expect(result.isHighlighted).toBeUndefined();
	});
});

describe("locationConfigSchema", () => {
	it("parses valid location config", () => {
		const config = {
			address: "San Francisco, CA",
			displayMode: "text" as const,
			linkType: "google" as const,
		};
		const result = locationConfigSchema.parse(config);
		expect(result.address).toBe("San Francisco, CA");
		expect(result.displayMode).toBe("text");
		expect(result.linkType).toBe("google");
	});

	it("applies defaults for missing fields", () => {
		const result = locationConfigSchema.parse({});
		expect(result.displayMode).toBe("text");
		expect(result.linkType).toBe("none");
	});

	it("accepts coordinates", () => {
		const config = {
			address: "NYC",
			coordinates: { lat: 40.7128, lng: -74.006 },
		};
		const result = locationConfigSchema.parse(config);
		expect(result.coordinates?.lat).toBe(40.7128);
		expect(result.coordinates?.lng).toBe(-74.006);
	});

	it("rejects invalid linkType", () => {
		expect(() =>
			locationConfigSchema.parse({ linkType: "bing" }),
		).toThrow();
	});

	it("rejects invalid displayMode", () => {
		expect(() =>
			locationConfigSchema.parse({ displayMode: "3d" }),
		).toThrow();
	});

	it("accepts optional customLinkUrl", () => {
		const config = {
			linkType: "custom" as const,
			customLinkUrl: "https://my-map.com/loc",
		};
		const result = locationConfigSchema.parse(config);
		expect(result.customLinkUrl).toBe("https://my-map.com/loc");
	});
});

describe("headerConfigSchema", () => {
	it("parses valid header config", () => {
		const config = {
			headingLevel: "h2" as const,
			textAlign: "center" as const,
			showDivider: true,
		};
		const result = headerConfigSchema.parse(config);
		expect(result.headingLevel).toBe("h2");
		expect(result.showDivider).toBe(true);
	});

	it("rejects invalid heading level", () => {
		expect(() =>
			headerConfigSchema.parse({ headingLevel: "h7" }),
		).toThrow();
	});
});

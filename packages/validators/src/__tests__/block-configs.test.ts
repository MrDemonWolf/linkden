import { describe, expect, it } from "vitest";
import {
	blockTypeSchema,
	createBlockSchema,
	dividerConfigSchema,
	embedTypeSchema,
	headerConfigSchema,
	httpUrlSchema,
	imageConfigSchema,
	linkConfigSchema,
	locationConfigSchema,
	MAX_BLOCK_CONFIG_LENGTH,
	parseBlockConfig,
	reorderBlocksSchema,
	textConfigSchema,
	updateBlockSchema,
} from "../blocks";

const baseBlock = { id: "blk_1", type: "link" as const, position: 0 };

describe("blockTypeSchema", () => {
	it("accepts every block type including the new ones", () => {
		for (const type of [
			"link",
			"header",
			"embed",
			"connect",
			"vcard",
			"location",
			"image",
			"text",
			"divider",
		]) {
			expect(blockTypeSchema.parse(type)).toBe(type);
		}
	});

	it("rejects invalid block type", () => {
		expect(() => blockTypeSchema.parse("invalid")).toThrow();
	});
});

describe("httpUrlSchema", () => {
	it("accepts http and https", () => {
		expect(httpUrlSchema.parse("https://a.b/c?d=1")).toBe("https://a.b/c?d=1");
		expect(httpUrlSchema.parse("http://a.b")).toBe("http://a.b");
	});

	it("rejects javascript:, data:, and relative URLs", () => {
		for (const bad of ["javascript:alert(1)", "data:text/html,hi", "/relative", "ftp://x.y", ""]) {
			expect(httpUrlSchema.safeParse(bad).success, bad).toBe(false);
		}
	});

	it("rejects URLs over 2048 chars", () => {
		expect(httpUrlSchema.safeParse(`https://a.b/${"x".repeat(2048)}`).success).toBe(false);
	});
});

describe("linkConfigSchema", () => {
	it("parses the full link config", () => {
		const result = linkConfigSchema.parse({
			variant: "featured",
			thumbnail: "https://cdn.test/thumb.jpg",
			description: "My cool link",
			emoji: "🔗",
			emojiPosition: "left",
			textAlign: "center",
			isHighlighted: true,
			isOutlined: false,
			newTab: true,
			noFollow: true,
			customBgColor: "#112233",
		});
		expect(result.variant).toBe("featured");
		expect(result.thumbnail).toBe("https://cdn.test/thumb.jpg");
		expect(result.newTab).toBe(true);
	});

	it("accepts empty config", () => {
		expect(linkConfigSchema.parse({})).toEqual({});
	});

	it("strips removed legacy keys instead of failing", () => {
		const result = linkConfigSchema.parse({
			animation: "pulse",
			openInNewTab: true,
			iconSlug: "x",
		});
		expect(result).toEqual({});
	});

	it("rejects a javascript: thumbnail", () => {
		expect(linkConfigSchema.safeParse({ thumbnail: "javascript:alert(1)" }).success).toBe(false);
	});

	it("rejects non-hex colors", () => {
		expect(linkConfigSchema.safeParse({ customBgColor: "red" }).success).toBe(false);
		expect(linkConfigSchema.safeParse({ customBgColor: "#fff" }).success).toBe(false);
		expect(linkConfigSchema.safeParse({ customBgColor: "#FFFFFF" }).success).toBe(true);
	});

	it("rejects an over-long description and unknown variant", () => {
		expect(linkConfigSchema.safeParse({ description: "x".repeat(201) }).success).toBe(false);
		expect(linkConfigSchema.safeParse({ variant: "hero" }).success).toBe(false);
	});
});

describe("headerConfigSchema", () => {
	it("parses heading level + section layout", () => {
		const result = headerConfigSchema.parse({
			headingLevel: "h2",
			textAlign: "center",
			showDivider: true,
			layout: "grid",
		});
		expect(result.headingLevel).toBe("h2");
		expect(result.layout).toBe("grid");
	});

	it("rejects invalid heading level and layout", () => {
		expect(headerConfigSchema.safeParse({ headingLevel: "h7" }).success).toBe(false);
		expect(headerConfigSchema.safeParse({ layout: "masonry" }).success).toBe(false);
	});
});

describe("embedTypeSchema", () => {
	it("rejects unknown embed types", () => {
		expect(embedTypeSchema.safeParse("vimeo").success).toBe(false);
		expect(embedTypeSchema.parse("youtube")).toBe("youtube");
	});
});

describe("locationConfigSchema", () => {
	it("parses address, linkType, coordinates", () => {
		const result = locationConfigSchema.parse({
			address: "NYC",
			linkType: "google",
			coordinates: { lat: 40.7128, lng: -74.006 },
		});
		expect(result.coordinates?.lat).toBe(40.7128);
		expect(result.linkType).toBe("google");
	});

	it("rejects invalid linkType, out-of-range coordinates, bad custom URL", () => {
		expect(locationConfigSchema.safeParse({ linkType: "bing" }).success).toBe(false);
		expect(locationConfigSchema.safeParse({ coordinates: { lat: 91, lng: 0 } }).success).toBe(
			false,
		);
		expect(locationConfigSchema.safeParse({ customLinkUrl: "javascript:1" }).success).toBe(false);
	});
});

describe("new block configs", () => {
	it("image: accepts src/alt/caption/aspect, blank src, rejects bad aspect", () => {
		const ok = imageConfigSchema.parse({
			src: "https://cdn.test/p.webp",
			alt: "A photo",
			caption: "Caption",
			aspect: "4:5",
		});
		expect(ok.aspect).toBe("4:5");
		expect(imageConfigSchema.parse({ src: "" }).src).toBe("");
		expect(imageConfigSchema.safeParse({ src: "https://x.y", aspect: "3:2" }).success).toBe(false);
		expect(imageConfigSchema.safeParse({ src: "javascript:1" }).success).toBe(false);
	});

	it("text: requires body ≤ 2000", () => {
		expect(textConfigSchema.parse({ body: "hi", textAlign: "left" }).body).toBe("hi");
		expect(textConfigSchema.safeParse({}).success).toBe(false);
		expect(textConfigSchema.safeParse({ body: "x".repeat(2001) }).success).toBe(false);
	});

	it("divider: accepts style/size enums", () => {
		expect(dividerConfigSchema.parse({ style: "dots", size: "lg" })).toEqual({
			style: "dots",
			size: "lg",
		});
		expect(dividerConfigSchema.parse({})).toEqual({});
		expect(dividerConfigSchema.safeParse({ style: "wavy" }).success).toBe(false);
	});
});

describe("parseBlockConfig", () => {
	it("treats empty/undefined JSON as {}", () => {
		expect(parseBlockConfig("link", undefined)).toEqual({ ok: true, data: {} });
		expect(parseBlockConfig("link", "  ")).toEqual({ ok: true, data: {} });
	});

	it("returns path-qualified issues", () => {
		const result = parseBlockConfig("link", JSON.stringify({ thumbnail: "javascript:1" }));
		expect(result.ok).toBe(false);
		if (!result.ok) expect(result.issues[0]).toMatch(/^config\.thumbnail: /);
	});

	it("reports invalid JSON", () => {
		expect(parseBlockConfig("text", "{nope")).toEqual({
			ok: false,
			issues: ["config: invalid JSON"],
		});
	});
});

describe("createBlockSchema", () => {
	it("accepts a minimal block and defaults nothing silently", () => {
		const result = createBlockSchema.parse(baseBlock);
		expect(result.type).toBe("link");
		expect(result.isEnabled).toBeUndefined();
	});

	it("rejects a javascript: url and embedUrl", () => {
		expect(createBlockSchema.safeParse({ ...baseBlock, url: "javascript:alert(1)" }).success).toBe(
			false,
		);
		expect(
			createBlockSchema.safeParse({ ...baseBlock, type: "embed", embedUrl: "javascript:1" })
				.success,
		).toBe(false);
	});

	it("accepts blank url/icon/embedType (cleared fields)", () => {
		expect(
			createBlockSchema.safeParse({ ...baseBlock, url: "", icon: "", embedType: "" }).success,
		).toBe(true);
	});

	it("validates icon format", () => {
		expect(createBlockSchema.safeParse({ ...baseBlock, icon: "lucide:globe" }).success).toBe(true);
		expect(createBlockSchema.safeParse({ ...baseBlock, icon: "brand:github" }).success).toBe(true);
		expect(createBlockSchema.safeParse({ ...baseBlock, icon: "globe" }).success).toBe(true);
		expect(createBlockSchema.safeParse({ ...baseBlock, icon: "<svg>" }).success).toBe(false);
	});

	it("rejects an unknown embedType", () => {
		expect(createBlockSchema.safeParse({ ...baseBlock, embedType: "vimeo" }).success).toBe(false);
	});

	it("parses config against the block type", () => {
		const bad = createBlockSchema.safeParse({
			...baseBlock,
			type: "text",
			config: JSON.stringify({ body: "x".repeat(2001) }),
		});
		expect(bad.success).toBe(false);
		if (!bad.success) expect(bad.error.issues[0]?.path).toEqual(["config"]);
		const good = createBlockSchema.safeParse({
			...baseBlock,
			type: "image",
			config: JSON.stringify({ src: "https://cdn.test/p.webp" }),
		});
		expect(good.success).toBe(true);
	});

	it("rejects oversize config", () => {
		expect(
			createBlockSchema.safeParse({
				...baseBlock,
				config: JSON.stringify({ description: "x".repeat(MAX_BLOCK_CONFIG_LENGTH) }),
			}).success,
		).toBe(false);
	});

	it("accepts ISO strings and Dates for the schedule, coerced to Date", () => {
		const result = createBlockSchema.parse({
			...baseBlock,
			scheduledStart: "2026-01-01T00:00:00.000Z",
			scheduledEnd: new Date("2026-02-01T00:00:00.000Z"),
		});
		expect(result.scheduledStart).toBeInstanceOf(Date);
		expect(result.scheduledEnd?.toISOString()).toBe("2026-02-01T00:00:00.000Z");
	});

	it("rejects a reversed schedule", () => {
		const result = createBlockSchema.safeParse({
			...baseBlock,
			scheduledStart: "2026-02-01T00:00:00.000Z",
			scheduledEnd: "2026-01-01T00:00:00.000Z",
		});
		expect(result.success).toBe(false);
		if (!result.success) expect(result.error.issues[0]?.path).toEqual(["scheduledEnd"]);
	});

	it("rejects an unparseable schedule string", () => {
		expect(createBlockSchema.safeParse({ ...baseBlock, scheduledStart: "tomorrow" }).success).toBe(
			false,
		);
	});
});

describe("updateBlockSchema", () => {
	it("requires only id", () => {
		expect(updateBlockSchema.parse({ id: "blk_1" })).toEqual({ id: "blk_1" });
	});

	it("skips config validation when type is absent (router checks the row)", () => {
		expect(
			updateBlockSchema.safeParse({ id: "blk_1", config: JSON.stringify({ body: 1 }) }).success,
		).toBe(true);
	});

	it("validates config when type is present", () => {
		expect(
			updateBlockSchema.safeParse({
				id: "blk_1",
				type: "text",
				config: JSON.stringify({ body: 1 }),
			}).success,
		).toBe(false);
	});

	it("allows clearing the schedule with null", () => {
		const result = updateBlockSchema.parse({
			id: "blk_1",
			scheduledStart: null,
			scheduledEnd: null,
		});
		expect(result.scheduledStart).toBeNull();
	});
});

describe("reorderBlocksSchema", () => {
	it("accepts an ordered list and caps at 200", () => {
		expect(reorderBlocksSchema.parse([{ id: "a", position: 0 }])).toHaveLength(1);
		const tooMany = Array.from({ length: 201 }, (_, i) => ({ id: `b${i}`, position: i }));
		expect(reorderBlocksSchema.safeParse(tooMany).success).toBe(false);
	});
});

import { socialBrandMap } from "@linkden/ui/social-brands";
import { describe, expect, it } from "vitest";
import {
	isLinkStackExport,
	mapButtonIdToIcon,
	mapThemeToPreset,
	transformLinkStackData,
} from "../utils/linkstack-transformer";

describe("transformLinkStackData", () => {
	it("maps links to link blocks, ordered by LinkStack order with dense positions", () => {
		const { blocks, settings } = transformLinkStackData({
			littlelink_name: "Ada",
			littlelink_description: "Engines",
			links: [
				{ button_id: "github", link: "https://github.com/ada", title: "GitHub", order: 2 },
				{ button_id: "custom_website", link: "http://ada.dev" },
			],
		});
		expect(blocks).toHaveLength(2);
		expect(blocks[0]).toMatchObject({
			title: "custom_website",
			icon: "lucide:globe",
			position: 0,
		});
		expect(blocks[1]).toMatchObject({
			type: "link",
			title: "GitHub",
			icon: "brand:github",
			position: 1,
		});
		expect(settings).toEqual({ display_name: "Ada", bio: "Engines" });
	});

	it("appends after the existing page when given a start position", () => {
		const { blocks } = transformLinkStackData(
			{
				links: [
					{ link: "https://a.example", order: 5 },
					{ link: "https://b.example", order: 5 },
					{ link: "https://c.example", order: 1 },
				],
			},
			{ startPosition: 4 },
		);
		expect(blocks.map((b) => [b.url, b.position])).toEqual([
			["https://c.example", 4],
			["https://a.example", 5],
			["https://b.example", 6],
		]);
	});

	it("drops links that are not http(s) URLs", () => {
		const { blocks } = transformLinkStackData({
			links: [
				{ link: "javascript:alert(document.cookie)", title: "xss" },
				{ link: "data:text/html,hi" },
				{ link: "" },
				{ link: "not a url" },
				{ link: "https://ok.example" },
			],
		});
		expect(blocks.map((b) => b.url)).toEqual(["https://ok.example"]);
	});

	it("imports a theme only when it names a LinkDen preset", () => {
		expect(transformLinkStackData({ theme: "Ocean Blue" }).settings).toEqual({
			theme_preset: "ocean-blue",
		});
		expect(transformLinkStackData({ theme: "galaxy" }).settings).toEqual({});
	});
});

describe("mapButtonIdToIcon", () => {
	it("maps popular networks to brand glyphs that exist", () => {
		const cases: Record<string, string> = {
			github: "brand:github",
			twitter: "brand:x",
			x: "brand:x",
			instagram: "brand:instagram",
			youtube: "brand:youtube",
			"apple-music": "brand:applemusic",
			ko_fi: "brand:kofi",
			buy_me_a_coffee: "brand:buymeacoffee",
			epic_games: "brand:epicgames",
		};
		for (const [buttonId, icon] of Object.entries(cases)) {
			expect(mapButtonIdToIcon(buttonId), buttonId).toBe(icon);
			expect(socialBrandMap.has(icon.slice("brand:".length)), icon).toBe(true);
		}
	});

	it("maps generic buttons to canonical lucide names", () => {
		expect(mapButtonIdToIcon("custom_website")).toBe("lucide:globe");
		expect(mapButtonIdToIcon("email")).toBe("lucide:mail");
	});

	it("ignores inherited object keys from untrusted input", () => {
		for (const key of ["constructor", "__proto__", "toString", "hasOwnProperty"]) {
			expect(mapButtonIdToIcon(key), key).toBeNull();
		}
	});

	it("returns null for unknown or missing ids", () => {
		expect(mapButtonIdToIcon(undefined)).toBeNull();
		expect(mapButtonIdToIcon("not-a-network")).toBeNull();
	});
});

describe("mapThemeToPreset", () => {
	it("rejects inherited keys and unknown names", () => {
		expect(mapThemeToPreset("constructor")).toBeNull();
		expect(mapThemeToPreset(undefined)).toBeNull();
		expect(mapThemeToPreset("dark")).toBe("dark");
	});
});

describe("isLinkStackExport", () => {
	it("requires a littlelink field and a links array", () => {
		expect(isLinkStackExport({ littlelink_name: "x", links: [] })).toBe(true);
		expect(isLinkStackExport({ links: [] })).toBe(false);
		expect(isLinkStackExport(null)).toBe(false);
	});
});

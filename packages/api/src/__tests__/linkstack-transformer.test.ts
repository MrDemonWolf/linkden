import { describe, expect, it } from "vitest";
import { isLinkStackExport, transformLinkStackData } from "../utils/linkstack-transformer";

describe("transformLinkStackData", () => {
	it("maps links to link blocks with icons and positions", () => {
		const { blocks, settings } = transformLinkStackData({
			littlelink_name: "Ada",
			littlelink_description: "Engines",
			links: [
				{ button_id: "github", link: "https://github.com/ada", title: "GitHub", order: 2 },
				{ button_id: "custom_website", link: "http://ada.dev" },
			],
		});
		expect(blocks).toHaveLength(2);
		expect(blocks[0]).toMatchObject({ type: "link", title: "GitHub", icon: "github", position: 2 });
		expect(blocks[1]).toMatchObject({ title: "custom_website", icon: "globe", position: 1 });
		expect(settings).toEqual({ display_name: "Ada", bio: "Engines" });
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
});

describe("isLinkStackExport", () => {
	it("requires a littlelink field and a links array", () => {
		expect(isLinkStackExport({ littlelink_name: "x", links: [] })).toBe(true);
		expect(isLinkStackExport({ links: [] })).toBe(false);
		expect(isLinkStackExport(null)).toBe(false);
	});
});

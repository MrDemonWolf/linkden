import { describe, expect, it } from "vitest";
import { clearCustomColors, parse, serialize } from "../theme-form";

const CUSTOM_KEYS = ["custom_primary", "custom_secondary", "custom_accent", "custom_background"];

function customValues(entries: ReturnType<typeof serialize>) {
	return entries.filter((e) => CUSTOM_KEYS.includes(e.key)).map((e) => e.value);
}

describe("Design → Theme form", () => {
	it("defaults the whole page to side by side for unset or unsupported layout values", () => {
		expect(parse({}).pageLayout).toBe("split");
		expect(parse({ page_layout: "carousel" }).pageLayout).toBe("split");
		expect(serialize(parse({}))).toContainEqual({ key: "page_layout", value: "split" });
	});

	it("round-trips the stacked page layout without changing saved colors or custom CSS", () => {
		const form = parse({
			page_layout: "stacked",
			custom_primary: "#FF0000",
			custom_css: ".ld-page { opacity: 0.95; }",
		});
		expect(form.pageLayout).toBe("stacked");
		expect(serialize(form)).toContainEqual({ key: "page_layout", value: "stacked" });
		expect(serialize(form)).toContainEqual({ key: "custom_primary", value: "#FF0000" });
		expect(serialize(form)).toContainEqual({
			key: "custom_css",
			value: ".ld-page { opacity: 0.95; }",
		});
	});

	it("treats unset custom colours as unset, so a save never pins preset values", () => {
		const form = parse({ theme_preset: "default", default_color_mode: "dark" });
		expect(customValues(serialize(form))).toEqual(["", "", "", ""]);
	});

	it("keeps stored overrides", () => {
		const form = parse({ custom_primary: "#FF0000", custom_background: "#000000" });
		expect(form.primaryColor).toBe("#FF0000");
		expect(form.bgColor).toBe("#000000");
		expect(form.secondaryColor).toBe("");
	});

	it("clears overrides when a preset is picked instead of copying its light palette", () => {
		const form = parse({
			custom_primary: "#FF0000",
			custom_accent: "#00FF00",
			verified_badge: "true",
			page_layout: "stacked",
		});
		const next = clearCustomColors(form, "midnight");
		expect(next.theme).toBe("midnight");
		expect(customValues(serialize(next))).toEqual(["", "", "", ""]);
		expect(next.verifiedBadge).toBe(true);
		expect(next.pageLayout).toBe("stacked");
	});
});

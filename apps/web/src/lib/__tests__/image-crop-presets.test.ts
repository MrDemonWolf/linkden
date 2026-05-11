import { describe, expect, it } from "vitest";
import { CROP_PRESETS, getCropPreset, type ImagePurpose } from "../image-crop-presets";

const ALL_PURPOSES: ImagePurpose[] = [
	"avatar",
	"banner",
	"og_image",
	"wallet_logo",
	"wallet_icon",
	"wallet_thumbnail",
	"wallet_strip",
	"logo",
	"favicon",
	"login_logo",
	"login_background",
];

describe("CROP_PRESETS", () => {
	it.each(ALL_PURPOSES)("has a preset for %s", (purpose) => {
		expect(CROP_PRESETS[purpose]).toBeDefined();
	});

	it.each(ALL_PURPOSES)("preset for %s declares a positive maxSize", (purpose) => {
		expect(CROP_PRESETS[purpose].maxSize).toBeGreaterThan(0);
	});

	it.each(ALL_PURPOSES)("preset for %s uses png or webp", (purpose) => {
		expect(["png", "webp"]).toContain(CROP_PRESETS[purpose].format);
	});

	it("aspect 1 for square purposes", () => {
		for (const p of ["avatar", "favicon", "wallet_icon", "wallet_thumbnail"] as const) {
			expect(CROP_PRESETS[p].aspect).toBe(1);
		}
	});

	it("banner uses 16:9", () => {
		expect(CROP_PRESETS.banner.aspect).toBeCloseTo(16 / 9);
	});

	it("free-aspect presets have undefined aspect", () => {
		expect(CROP_PRESETS.logo.aspect).toBeUndefined();
		expect(CROP_PRESETS.login_logo.aspect).toBeUndefined();
	});
});

describe("getCropPreset", () => {
	it("returns the same preset as the map lookup", () => {
		for (const p of ALL_PURPOSES) {
			expect(getCropPreset(p)).toBe(CROP_PRESETS[p]);
		}
	});
});

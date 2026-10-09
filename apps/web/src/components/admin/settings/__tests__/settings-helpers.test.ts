import { SECRET_MASK } from "@linkden/validators/settings-registry";
import { describe, expect, it } from "vitest";
import { captchaErrors } from "../captcha-section";
import { isLinkStackExport, prepareLinkStackImport } from "../linkstack-payload";
import { mutationErrorMessage } from "../mutation-error";
import { timezoneItems } from "../preferences-section";
import { editMaskedSecret } from "../secret-input";
import { seoErrors } from "../seo-section";

describe("editMaskedSecret", () => {
	it("passes edits through once the field no longer holds the mask", () => {
		expect(editMaskedSecret("re_old", "re_new")).toBe("re_new");
	});

	it("drops the mask when a key is pasted before or after it", () => {
		expect(editMaskedSecret(SECRET_MASK, `${SECRET_MASK}re_live_123`)).toBe("re_live_123");
		expect(editMaskedSecret(SECRET_MASK, `re_live_123${SECRET_MASK}`)).toBe("re_live_123");
	});

	it("clears the field when part of the mask is deleted or typed into", () => {
		expect(editMaskedSecret(SECRET_MASK, SECRET_MASK.slice(1))).toBe("");
		expect(editMaskedSecret(SECRET_MASK, "•••x•••")).toBe("x");
	});

	it("keeps a value that replaced the selected mask", () => {
		expect(editMaskedSecret(SECRET_MASK, "re_live_123")).toBe("re_live_123");
	});
});

describe("mutationErrorMessage", () => {
	it("shows a deliberate 4xx router message", () => {
		const err = { message: "Signer key must be PEM", data: { httpStatus: 400 } };
		expect(mutationErrorMessage(err, "fallback")).toBe("Signer key must be PEM");
	});

	it("falls back for 5xx, zod issue lists and non-tRPC errors", () => {
		expect(mutationErrorMessage({ message: "db exploded", data: { httpStatus: 500 } }, "x")).toBe(
			"x",
		);
		expect(
			mutationErrorMessage({ message: '[{"code":"too_big"}]', data: { httpStatus: 400 } }, "x"),
		).toBe("x");
		expect(mutationErrorMessage(new Error("network"), "x")).toBe("x");
		expect(mutationErrorMessage(null, "x")).toBe("x");
	});
});

describe("captchaErrors", () => {
	it("checks nothing while CAPTCHA is off", () => {
		expect(
			captchaErrors({ captchaProvider: "none", captchaSiteKey: "", captchaSecretKey: "" }),
		).toEqual({});
	});

	it("requires both keys once a provider is selected", () => {
		expect(
			captchaErrors({ captchaProvider: "hcaptcha", captchaSiteKey: " ", captchaSecretKey: "" }),
		).toEqual({ captchaSiteKey: "Required", captchaSecretKey: "Required" });
	});

	it("treats a saved (masked) secret as filled", () => {
		expect(
			captchaErrors({
				captchaProvider: "turnstile",
				captchaSiteKey: "0x4AAA",
				captchaSecretKey: SECRET_MASK,
			}),
		).toEqual({});
	});
});

describe("seoErrors", () => {
	it("accepts lengths the server accepts, beyond the search-engine guideline", () => {
		expect(seoErrors({ seoTitle: "t".repeat(85), seoDescription: "d".repeat(200) })).toEqual({});
	});

	it("rejects lengths past the registry limit", () => {
		const errors = seoErrors({ seoTitle: "t".repeat(101), seoDescription: "d".repeat(251) });
		expect(Object.keys(errors).sort()).toEqual(["seoDescription", "seoTitle"]);
	});
});

describe("timezoneItems", () => {
	it("labels the unset option as UTC (what Insights buckets by)", () => {
		expect(timezoneItems("", "UTC")[0]).toEqual({ value: "", label: "Not set (UTC)" });
	});

	it("adds the browser zone and a stored zone missing from the common list", () => {
		const values = timezoneItems("Europe/Madrid", "America/Phoenix").map((i) => i.value);
		expect(values).toContain("America/Phoenix");
		expect(values).toContain("Europe/Madrid");
		expect(values.filter((v) => v === "America/Phoenix")).toHaveLength(1);
		expect(
			timezoneItems("Asia/Tokyo", "Asia/Tokyo").filter((i) => i.value === "Asia/Tokyo"),
		).toHaveLength(1);
	});
});

describe("prepareLinkStackImport", () => {
	// Shape of a real LinkStack "Export all data" file: numeric button ids,
	// string `type`, nulls for unset columns, and non-web links.
	const realExport = {
		name: "wolf",
		littlelink_name: "MrDemonWolf",
		littlelink_description: null,
		theme: null,
		image_data: "iVBORw0KGgo…",
		links: [
			{
				id: 1,
				button_id: 2,
				link: "https://github.com/mrdemonwolf",
				title: "GitHub",
				order: 1,
				click_number: 4,
				type: "link",
				type_params: null,
				custom_css: "",
				custom_icon: "fa-github",
			},
			{ button_id: 93, link: "mailto:me@example.com", title: "Email", order: 2, type: null },
			{ button_id: "website", link: " https://example.com ", title: null, order: 0 },
			{ button_id: 5, link: null, title: "Heading", order: 3, type: "heading" },
			"garbage",
		],
	};

	it("recognizes a LinkStack export", () => {
		expect(isLinkStackExport(realExport)).toBe(true);
		expect(isLinkStackExport({ links: [] })).toBe(false);
		expect(isLinkStackExport(null)).toBe(false);
	});

	it("sends only the fields the importer reads, with the types it accepts", () => {
		const { payload, linksFound, linksSkipped } = prepareLinkStackImport(realExport);
		expect(payload).toEqual({
			littlelink_name: "MrDemonWolf",
			littlelink_description: undefined,
			theme: undefined,
			links: [
				{ link: "https://github.com/mrdemonwolf", title: "GitHub", button_id: undefined, order: 1 },
				{ link: "https://example.com", title: undefined, button_id: "website", order: 0 },
			],
		});
		expect(linksFound).toBe(3);
		expect(linksSkipped).toBe(1);
	});
});

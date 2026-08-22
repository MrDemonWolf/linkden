import { describe, expect, it } from "vitest";
import { socialBrands } from "../../../ui/src/social-brands";
import { SOCIAL_SLUGS, socialNetworkUpdateSchema, updateSocialSchema } from "../social";

describe("social validators", () => {
	it("slug list matches the ui brand catalogue exactly", () => {
		expect([...SOCIAL_SLUGS].sort()).toEqual(socialBrands.map((b) => b.slug).sort());
	});

	it("accepts a known slug with an http(s) url", () => {
		const r = socialNetworkUpdateSchema.parse({
			slug: "github",
			url: "https://github.com/ada",
			isActive: true,
		});
		expect(r.slug).toBe("github");
	});

	it("accepts an empty url (clears the network)", () => {
		expect(
			socialNetworkUpdateSchema.safeParse({ slug: "github", url: "", isActive: false }).success,
		).toBe(true);
	});

	it("rejects an unknown slug", () => {
		expect(
			socialNetworkUpdateSchema.safeParse({ slug: "myspace", url: "https://x.y", isActive: true })
				.success,
		).toBe(false);
	});

	it("rejects non-http urls", () => {
		for (const url of ["javascript:alert(1)", "ftp://x.y/z", "not a url"]) {
			expect(
				socialNetworkUpdateSchema.safeParse({ slug: "github", url, isActive: true }).success,
				url,
			).toBe(false);
		}
	});

	it("caps the bulk payload at the number of known networks", () => {
		const row = { slug: "github", url: "https://github.com/a", isActive: true };
		expect(updateSocialSchema.safeParse(Array(SOCIAL_SLUGS.length + 1).fill(row)).success).toBe(
			false,
		);
	});
});

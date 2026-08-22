import { describe, expect, it } from "vitest";
import { vcardDataSchema } from "../vcard";

describe("vcardDataSchema", () => {
	it("accepts a full record", () => {
		const r = vcardDataSchema.parse({
			fullName: "Ada Lovelace",
			email: "ada@example.com",
			workEmail: "ada@work.example.com",
			phone: "+1 555 0100",
			photo: "https://cdn.example.com/ada.png",
			urls: [{ label: "Site", url: "https://ada.dev" }],
		});
		expect(r.urls?.[0]?.url).toBe("https://ada.dev");
	});

	it("accepts an empty object and blank emails/urls", () => {
		expect(vcardDataSchema.safeParse({}).success).toBe(true);
		expect(vcardDataSchema.safeParse({ email: "", photo: "" }).success).toBe(true);
		expect(vcardDataSchema.safeParse({ urls: [{ label: "", url: "" }] }).success).toBe(true);
	});

	it("rejects a malformed email", () => {
		expect(vcardDataSchema.safeParse({ email: "not-an-email" }).success).toBe(false);
		expect(vcardDataSchema.safeParse({ workEmail: "ada@" }).success).toBe(false);
	});

	it("rejects non-http urls", () => {
		expect(vcardDataSchema.safeParse({ photo: "javascript:alert(1)" }).success).toBe(false);
		expect(vcardDataSchema.safeParse({ urls: [{ label: "x", url: "nope" }] }).success).toBe(false);
	});

	it("bounds every text field", () => {
		expect(vcardDataSchema.safeParse({ fullName: "x".repeat(101) }).success).toBe(false);
		expect(vcardDataSchema.safeParse({ phone: "1".repeat(41) }).success).toBe(false);
		expect(vcardDataSchema.safeParse({ address: "x".repeat(301) }).success).toBe(false);
		expect(
			vcardDataSchema.safeParse({ urls: Array(21).fill({ label: "a", url: "" }) }).success,
		).toBe(false);
	});
});

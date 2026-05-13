import { describe, expect, it } from "vitest";
import {
	captchaSettingsSchema,
	contactFormSettingsSchema,
	emailSettingsSchema,
	updateSettingSchema,
	vcardSettingsSchema,
	walletSettingsSchema,
} from "../settings";

describe("updateSettingSchema", () => {
	it("accepts a key/value pair", () => {
		const r = updateSettingSchema.parse({ key: "theme_preset", value: "midnight" });
		expect(r.key).toBe("theme_preset");
	});

	it("rejects empty key", () => {
		expect(() => updateSettingSchema.parse({ key: "", value: "x" })).toThrow();
	});

	it("rejects non-string value", () => {
		expect(() => updateSettingSchema.parse({ key: "k", value: 1 as unknown as string })).toThrow();
	});
});

describe("contactFormSettingsSchema", () => {
	it("accepts a full config", () => {
		const r = contactFormSettingsSchema.parse({
			enabled: true,
			fields: { phone: true, subject: false, company: true },
			delivery: { email: "ops@example.com", webhook: "https://hooks.example.com/x" },
		});
		expect(r.delivery?.email).toBe("ops@example.com");
	});

	it("rejects bad email", () => {
		expect(() =>
			contactFormSettingsSchema.parse({ delivery: { email: "not-an-email" } }),
		).toThrow();
	});

	it("rejects bad webhook url", () => {
		expect(() => contactFormSettingsSchema.parse({ delivery: { webhook: "not a url" } })).toThrow();
	});
});

describe("vcardSettingsSchema", () => {
	it("accepts valid vcard data", () => {
		const r = vcardSettingsSchema.parse({
			enabled: true,
			vcardData: {
				fullName: "Ada",
				workEmail: "ada@example.com",
				urls: ["https://ada.dev"],
			},
		});
		expect(r.vcardData?.fullName).toBe("Ada");
	});

	it("rejects non-url in urls array", () => {
		expect(() => vcardSettingsSchema.parse({ vcardData: { urls: ["nope"] } })).toThrow();
	});
});

describe("captchaSettingsSchema", () => {
	it("accepts partial config", () => {
		expect(() => captchaSettingsSchema.parse({ provider: "turnstile" })).not.toThrow();
	});
});

describe("emailSettingsSchema", () => {
	it("accepts partial config", () => {
		expect(() => emailSettingsSchema.parse({ provider: "resend" })).not.toThrow();
	});
});

describe("walletSettingsSchema", () => {
	it("accepts partial config", () => {
		expect(() => walletSettingsSchema.parse({ enabled: true })).not.toThrow();
	});
});

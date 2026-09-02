import { describe, expect, it } from "vitest";
import { emailErrors } from "@/components/admin/settings/email-section";

// A stored API key with a blank From address used to save cleanly and then send
// as noreply@example.com, which no provider accepts — "Email settings saved"
// for a setup that cannot send.
describe("emailErrors", () => {
	it("rejects an API key with no sender address", () => {
		expect(emailErrors({ emailApiKey: "re_123", emailFrom: "" }).emailFrom).toBeDefined();
		expect(emailErrors({ emailApiKey: "re_123", emailFrom: "   " }).emailFrom).toBeDefined();
	});

	it("accepts an API key with a sender address", () => {
		expect(emailErrors({ emailApiKey: "re_123", emailFrom: "hi@example.com" })).toEqual({});
		expect(emailErrors({ emailApiKey: "re_123", emailFrom: "Me <hi@example.com>" })).toEqual({});
	});

	it("leaves a fully blank configuration alone", () => {
		expect(emailErrors({ emailApiKey: "", emailFrom: "" })).toEqual({});
	});

	it("still rejects a malformed sender address", () => {
		expect(emailErrors({ emailApiKey: "", emailFrom: "not-an-email" }).emailFrom).toBeDefined();
	});
});

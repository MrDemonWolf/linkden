import { describe, expect, it } from "vitest";
import { resolveEmailTransport } from "../utils/email";

describe("resolveEmailTransport", () => {
	const configured = { email_api_key: "re_live", email_from: "site@example.com" };

	it("uses Resend when selected or when no provider is stored", () => {
		expect(resolveEmailTransport({ ...configured, email_provider: "resend" })).toEqual({
			provider: "resend",
			apiKey: "re_live",
			from: "site@example.com",
		});
		expect(resolveEmailTransport(configured)?.provider).toBe("resend");
	});

	it("refuses unimplemented providers so their keys never reach Resend", () => {
		for (const provider of ["sendgrid", "mailgun", "smtp", "cloudflare", "none"]) {
			expect(
				resolveEmailTransport({ ...configured, email_provider: provider }),
				provider,
			).toBeNull();
		}
	});

	it("needs both an API key and a from address", () => {
		expect(resolveEmailTransport({ email_api_key: "re_live" })).toBeNull();
		expect(resolveEmailTransport({ email_from: "site@example.com" })).toBeNull();
	});
});

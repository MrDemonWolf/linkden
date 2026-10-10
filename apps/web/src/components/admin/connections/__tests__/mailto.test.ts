import { describe, expect, it } from "vitest";
import { mailtoHref } from "../mailto";

describe("mailtoHref", () => {
	it("keeps a plain address readable", () => {
		expect(mailtoHref("ada@example.com")).toBe("mailto:ada@example.com");
	});

	it("cannot smuggle headers into the reply", () => {
		const href = mailtoHref("victim@x.com?bcc=attacker@evil.com&subject=hi");
		expect(href).toBe("mailto:victim@x.com%3Fbcc%3Dattacker@evil.com%26subject%3Dhi");
		expect(href).not.toContain("?");
		expect(href).not.toContain("&");
	});
});

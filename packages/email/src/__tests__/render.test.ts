import { describe, expect, it } from "vitest";
import { renderContactNotification } from "../render";

describe("renderContactNotification", () => {
	it("renders the submission into HTML", async () => {
		const html = await renderContactNotification({
			name: "Ada Lovelace",
			email: "ada@example.com",
			message: "Hello there",
			subject: "Conference",
		});
		expect(html).toContain("Ada Lovelace");
		expect(html).toContain("ada@example.com");
		expect(html).toContain("Hello there");
		expect(html.toLowerCase()).toContain("<!doctype html");
	});
});

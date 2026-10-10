import { describe, expect, it } from "vitest";
import { renderContactNotification } from "../render";
import { LINKDEN_HOME_URL } from "../templates/contact-notification";

describe("renderContactNotification", () => {
	it("renders the submission into HTML", async () => {
		const html = await renderContactNotification({
			name: "Ada Lovelace",
			email: "ada@example.com",
			message: "Hello there",
			whereMet: "Conference",
		});
		expect(html).toContain("Ada Lovelace");
		expect(html).toContain("ada@example.com");
		expect(html).toContain("Hello there");
		expect(html.toLowerCase()).toContain("<!doctype html");
	});

	it("labels the where-we-met answer as such, not as a subject", async () => {
		const html = await renderContactNotification({
			name: "Ada Lovelace",
			email: "ada@example.com",
			message: "Hello there",
			whereMet: "Conference",
			blockTitle: "Let's connect",
		});
		expect(html).toContain("Where we met");
		expect(html).toContain("Conference");
		expect(html).toContain(">Form<");
		expect(html).toContain("Let&#x27;s connect");
		expect(html).not.toContain("Subject");
	});

	it("omits the optional rows when they are not supplied", async () => {
		const html = await renderContactNotification({
			name: "Ada",
			email: "ada@example.com",
			message: "Hi",
			whereMet: null,
			blockTitle: null,
		});
		expect(html).not.toContain("Where we met");
		expect(html).not.toContain(">Form<");
	});

	it("links the footer to the project's real home, never the unregistered linkden.io", async () => {
		const html = await renderContactNotification({
			name: "Ada",
			email: "ada@example.com",
			message: "Hi",
		});
		expect(html).toContain(`href="${LINKDEN_HOME_URL}"`);
		expect(html).not.toContain("linkden.io");
	});
});

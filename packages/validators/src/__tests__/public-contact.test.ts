import { describe, expect, it } from "vitest";
import { validatePublicContactUrl } from "../public-contact";

const site = "https://links.example.com";
const endpoint = `${site}/api/contact`;

describe("explicit public contact ingress configuration", () => {
	it("accepts an exact HTTPS action on the profile host or a separate explicit public API host", () => {
		expect(validatePublicContactUrl(endpoint, site)).toBe(endpoint);
		expect(validatePublicContactUrl("https://api.example.com/api/contact", site)).toBe(
			"https://api.example.com/api/contact",
		);
	});
	it.each([
		undefined,
		"",
		"not-a-url",
		"http://links.example.com/api/contact",
		`${endpoint}/`,
		`${endpoint}?token=secret`,
		`${endpoint}#fragment`,
		`${site}/api/*`,
		`${site}/api/auth`,
		`${site}/api/%63ontact`,
		`${site}/api/contact/../contact`,
		`${site}/api/contact-extra`,
		"https://user:password@links.example.com/api/contact",
		"https://links.example.com:443/api/contact",
		"https://links.example.com:8443/api/contact",
		"https://linkden.owner.workers.dev/api/contact",
		"https://workers.dev/api/contact",
		"https://localhost/api/contact",
		"https://preview.localhost/api/contact",
		"https://127.0.0.1/api/contact",
		"https://[::1]/api/contact",
		"https://api.example.com./api/contact",
	])("rejects an absent or ambiguous contact action %s", (value) => {
		expect(validatePublicContactUrl(value, site)).toBeNull();
	});
	it.each([
		undefined,
		"",
		`${site}/`,
		`${site}/path`,
		`${site}?query=1`,
		"http://links.example.com",
		"https://user:secret@links.example.com",
		"https://links.example.com:443",
		"https://links.example.com:8443",
		"https://linkden.owner.workers.dev",
		"https://workers.dev",
		"https://localhost",
		"https://preview.localhost",
		"https://127.0.0.1",
		"https://127.1",
		"https://[::1]",
		"https://links.example.com.",
	])("requires a bare custom public HTTPS origin %s", (publicSiteURL) => {
		expect(validatePublicContactUrl(`${publicSiteURL}/api/contact`, publicSiteURL)).toBeNull();
	});
});

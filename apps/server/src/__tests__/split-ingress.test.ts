// @vitest-environment node
import { describe, expect, it } from "vitest";
import { splitApiIngress } from "../lib/split-ingress";

const origin = "https://public.example";
const endpoint = `${origin}/api/contact`;
const bindings = {
	LINKDEN_SERVING_MODE: "split",
	PUBLIC_SITE_URL: origin,
	PUBLIC_CONTACT_URL: endpoint,
	CORS_ORIGIN: "https://admin.example",
};
const request = (url: string, method = "POST", headers?: Record<string, string>) =>
	new Request(url, { method, headers });

describe("split API ingress", () => {
	it("keeps existing legacy requests unchanged while unknown modes fail closed", () => {
		const req = request("https://old-api.example/trpc/settings.update");
		expect(splitApiIngress(req, {})).toBe("allow");
		expect(splitApiIngress(req, { ...bindings, LINKDEN_SERVING_MODE: "legacy" })).toBe("allow");
		expect(splitApiIngress(req, { ...bindings, LINKDEN_SERVING_MODE: "Split" })).toBe(
			"unavailable",
		);
	});
	it.each(["POST", "OPTIONS"])("allows only exact opted-in public %s contact", (method) => {
		expect(splitApiIngress(request(endpoint, method), bindings)).toBe("allow");
	});
	it("allows a separate explicit public API action without exposing the profile host or its other API paths", () => {
		const apiEndpoint = "https://api.example.com/api/contact";
		const configured = { ...bindings, PUBLIC_CONTACT_URL: apiEndpoint };
		expect(splitApiIngress(request(apiEndpoint), configured)).toBe("allow");
		expect(splitApiIngress(request(endpoint), configured)).toBe("not-found");
		expect(
			splitApiIngress(request("https://api.example.com/trpc/settings.getAll"), configured),
		).toBe("not-found");
	});
	it.each([
		`${origin}/`,
		`${origin}/api/auth/sign-in/email`,
		`${origin}/trpc/settings.getAll`,
		`${origin}/api/images/avatar/a.png`,
		`${origin}/api/admin/wallet-pass`,
		`${origin}/api/vcard`,
		`${endpoint}/`,
		`${endpoint}-extra`,
		`${endpoint}?ignored=1`,
		`${endpoint}#fragment`,
		`${origin}/api/%63ontact`,
		"https://admin.example/api/contact",
		"https://alias.workers.dev/api/contact",
		"http://public.example/api/contact",
	])("rejects other public host paths and aliases %s", (url) => {
		expect(splitApiIngress(request(url), bindings)).toBe("not-found");
	});
	it.each(["GET", "HEAD", "PUT", "PATCH", "DELETE"])(
		"does not expose public %s contact",
		(method) => {
			expect(splitApiIngress(request(endpoint, method), bindings)).toBe("not-found");
		},
	);
	it("does not infer public routing when the owner has not opted in", () => {
		expect(splitApiIngress(request(endpoint), { ...bindings, PUBLIC_CONTACT_URL: undefined })).toBe(
			"not-found",
		);
		expect(
			splitApiIngress(request(endpoint), {
				...bindings,
				PUBLIC_CONTACT_URL: "https://other.example/api/contact-extra",
			}),
		).toBe("unavailable");
		expect(splitApiIngress(request(endpoint), { ...bindings, CORS_ORIGIN: origin })).toBe(
			"unavailable",
		);
	});
	it("retains the fixed private service-binding placeholder even without contact setup", () => {
		for (const path of [
			"/api/health",
			"/api/auth/sign-in/email",
			"/trpc/settings.update",
			"/api/images/avatar/a.png",
		])
			expect(
				splitApiIngress(request(`https://api.internal${path}`), { LINKDEN_SERVING_MODE: "split" }),
			).toBe("allow");
		for (const url of [
			"http://api.internal/api/health",
			"https://api.internal:444/api/health",
			"https://api.internal.evil.example/api/health",
		])
			expect(splitApiIngress(request(url), bindings)).toBe("not-found");
	});
	it("does not trust Host or forwarding headers to turn a public request into a binding", () => {
		expect(
			splitApiIngress(
				request(`${origin}/trpc/settings.getAll`, "GET", {
					host: "api.internal",
					"x-forwarded-host": "api.internal",
					"x-linkden-api-proxy": "1",
				}),
				bindings,
			),
		).toBe("not-found");
		expect(
			splitApiIngress(
				request("https://api.internal/api/health", "GET", { host: "public.example" }),
				bindings,
			),
		).toBe("not-found");
	});
});

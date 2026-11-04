// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import { isApiPath, proxyApiRequest } from "../api-proxy";

describe("isApiPath", () => {
	it("matches the prefixes the API worker's zone Routes cover", () => {
		expect(isApiPath("/api/auth/get-session")).toBe(true);
		expect(isApiPath("/api/images/avatar/x.png")).toBe(true);
		expect(isApiPath("/trpc/public.getPage")).toBe(true);
	});

	it("leaves the web worker's own paths alone", () => {
		expect(isApiPath("/")).toBe(false);
		expect(isApiPath("/og")).toBe(false);
		expect(isApiPath("/admin/links")).toBe(false);
		expect(isApiPath("/api")).toBe(false);
		expect(isApiPath("/apiary")).toBe(false);
		expect(isApiPath("/trpcx/a")).toBe(false);
	});
});

describe("proxyApiRequest", () => {
	const api = () => ({ fetch: vi.fn(async () => new Response("api")) }) as unknown as Fetcher;

	it("forwards an API request to the binding unchanged", async () => {
		const binding = api();
		const request = new Request("https://linkden.example.workers.dev/api/auth/sign-in/email", {
			method: "POST",
			headers: { cookie: "s=1", "cf-connecting-ip": "203.0.113.7" },
			body: "{}",
		});
		const res = await proxyApiRequest(request, { API: binding });
		expect(await res?.text()).toBe("api");
		expect(binding.fetch).toHaveBeenCalledWith(request);
	});

	it("returns undefined for web paths or without a binding", () => {
		const binding = api();
		expect(
			proxyApiRequest(new Request("https://a.example/admin"), { API: binding }),
		).toBeUndefined();
		expect(proxyApiRequest(new Request("https://a.example/trpc/x"), {})).toBeUndefined();
		expect(binding.fetch).not.toHaveBeenCalled();
	});
});

// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const transport = vi.hoisted(() => ({ context: vi.fn(), binding: vi.fn(), network: vi.fn() }));
vi.mock("@opennextjs/cloudflare", () => ({ getCloudflareContext: transport.context }));
vi.mock("@linkden/env/web", () => ({
	env: { NEXT_PUBLIC_SERVER_URL: "https://preview.example.test" },
}));

import { apiFetch } from "../server-api";

beforeEach(() => {
	transport.context.mockReset().mockImplementation(() => {
		throw new Error("No Workers context");
	});
	transport.binding.mockReset().mockResolvedValue(new Response("binding"));
	transport.network.mockReset().mockResolvedValue(new Response("network"));
	vi.stubGlobal("fetch", transport.network);
	vi.stubEnv("INTERNAL_SERVER_URL", "");
});
afterEach(() => {
	vi.unstubAllGlobals();
	vi.unstubAllEnvs();
});

describe("server-side API transport", () => {
	it.each(["http://localhost:13000", "http://127.0.0.1:13000/", "http://[::1]:13000"])(
		"uses a strict loopback origin for local SSR: %s",
		async (origin) => {
			vi.stubEnv("INTERNAL_SERVER_URL", origin);
			const init = { headers: { cookie: "session=dummy" }, cache: "no-store" } as const;
			await apiFetch("/trpc/public.getPage?probe=1", init);
			expect(transport.network).toHaveBeenCalledWith(
				`${new URL(origin).origin}/trpc/public.getPage?probe=1`,
				init,
			);
		},
	);

	it.each([
		"",
		"https://127.0.0.1:13000",
		"https://external.example.test",
		"http://external.example.test",
		"http://localhost.example.test:13000",
		"http://user@localhost:13000",
		"http://2130706433:13000",
		"http://127.1:13000",
		"http://%6cocalhost:13000",
		"http://localhost:13000/path",
		"http://localhost:13000/path/..",
		"http://localhost:13000?query=1",
		"http://localhost:13000#fragment",
		" http://localhost:13000",
		"http://localhost:13000\\evil",
		"invalid",
	])("falls back to the configured public URL for invalid internal origin %j", async (origin) => {
		vi.stubEnv("INTERNAL_SERVER_URL", origin);
		await apiFetch("/trpc/public.getPage");
		expect(transport.network).toHaveBeenCalledWith(
			"https://preview.example.test/trpc/public.getPage",
			undefined,
		);
	});

	it("always prefers the production service binding", async () => {
		vi.stubEnv("INTERNAL_SERVER_URL", "http://127.0.0.1:13000");
		transport.context.mockReturnValue({
			env: { API: { fetch: transport.binding } },
			cf: { colo: "TEST" },
		});
		const response = await apiFetch("/api/auth/get-session", {
			headers: { cookie: "session=dummy" },
		});
		expect(await response.text()).toBe("binding");
		const request = transport.binding.mock.calls[0]?.[0] as Request;
		expect(request.url).toBe("https://api.internal/api/auth/get-session");
		expect(request.headers.get("cookie")).toBe("session=dummy");
		expect(transport.network).not.toHaveBeenCalled();
	});
});

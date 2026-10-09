// @vitest-environment node
import { DynamicServerError } from "next/dist/client/components/hooks-server-context";
import { beforeEach, describe, expect, it, vi } from "vitest";

const apiFetch = vi.fn<(path: string, init?: RequestInit) => Promise<Response>>();
vi.mock("../server-api", () => ({
	apiFetch: (path: string, init?: RequestInit) => apiFetch(path, init),
}));

const { getPublicPageResult } = await import("../public-page");

describe("getPublicPageResult", () => {
	// Block body: a function returned from beforeEach runs as teardown, and the
	// mock itself is a function.
	beforeEach(() => {
		apiFetch.mockReset();
	});

	it("returns the payload on a tRPC success", async () => {
		const data = { profile: null, blocks: [], settings: {} };
		apiFetch.mockResolvedValue(Response.json({ result: { data } }));
		await expect(getPublicPageResult()).resolves.toEqual({ ok: true, data });
		expect(apiFetch).toHaveBeenCalledWith("/trpc/public.getPage", { cache: "no-store" });
	});

	it("reports an unreachable API as ok: false instead of throwing", async () => {
		apiFetch.mockRejectedValue(new TypeError("fetch failed"));
		await expect(getPublicPageResult()).resolves.toEqual({ ok: false, data: null });
	});

	it("reports an API error status as ok: false", async () => {
		apiFetch.mockResolvedValue(new Response("nope", { status: 500 }));
		await expect(getPublicPageResult()).resolves.toEqual({ ok: false, data: null });
	});

	// `next build` signals "this route is dynamic" by throwing from the no-store
	// fetch. Swallowing it prerendered "/" with no data, which failed the build.
	it("lets Next's dynamic-rendering bailout through", async () => {
		const bailout = new DynamicServerError("no-store fetch");
		apiFetch.mockRejectedValue(bailout);
		await expect(getPublicPageResult()).rejects.toBe(bailout);
	});
});

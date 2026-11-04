import { beforeEach, describe, expect, it, vi } from "vitest";

// "/" before the first admin exists must send the visitor into the setup
// wizard (WordPress-style), not render a splash page.

const redirect = vi.fn((url: string) => {
	throw new Error(`NEXT_REDIRECT:${url}`);
});
vi.mock("next/navigation", () => ({ redirect, unstable_rethrow: () => {} }));

const getPublicPageResult = vi.fn();
vi.mock("@/lib/public-page", () => ({
	getPublicPageResult,
	getPublicPage: async () => (await getPublicPageResult()).data,
}));

beforeEach(() => {
	process.env.NEXT_PUBLIC_SERVER_URL = "https://api.example.test";
	process.env.NEXT_PUBLIC_SITE_URL = "https://links.example.test";
	redirect.mockClear();
});

describe("home page before setup", () => {
	it("redirects to /admin/setup when no admin exists", async () => {
		getPublicPageResult.mockResolvedValue({ ok: true, data: { profile: null } });
		const { default: Home } = await import("../page");
		await expect(Home()).rejects.toThrow("NEXT_REDIRECT:/admin/setup");
		expect(redirect).toHaveBeenCalledWith("/admin/setup");
	});

	it("still throws to the error page when the API is unreachable", async () => {
		getPublicPageResult.mockResolvedValue({ ok: false, data: null });
		const { default: Home } = await import("../page");
		await expect(Home()).rejects.toThrow("Public page data is unavailable");
		expect(redirect).not.toHaveBeenCalled();
	});
});

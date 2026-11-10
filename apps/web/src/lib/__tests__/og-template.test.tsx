// @vitest-environment node
import type { ReactElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { canonicalOgSearch, normalizeOgParams, ogContentFromPage } from "../og-params";
import { OG_IMAGE_SIZE, renderOgTemplate } from "../og-template";

const api = vi.hoisted(() => ({
	page: vi.fn(),
	session: vi.fn(),
	limit: vi.fn(),
	rendered: [] as { element: ReactElement; options: unknown }[],
}));
vi.mock("next/og", () => ({
	ImageResponse: class extends Response {
		constructor(element: ReactElement, options: unknown) {
			super("Mock image", { headers: { "Content-Type": "image/png" } });
			api.rendered.push({ element, options });
		}
	},
}));
vi.mock("@opennextjs/cloudflare", () => ({
	getCloudflareContext: () => ({
		env: { RL_OG: { limit: api.limit } },
		ctx: {
			waitUntil: (promise: Promise<unknown>) => {
				void promise;
			},
		},
	}),
}));
vi.mock("@/lib/public-page", () => ({ getPublicPage: api.page }));
vi.mock("@/lib/server-api", () => ({ apiFetch: api.session }));
const { GET } = await import("../../app/og/route");

const origin = "https://profile.example.test";
const page = {
	profile: { name: "Stored <b>Wolf</b>", bio: "Stored bio", image: null },
	settings: { customPrimary: "#123456", themePreset: "default" },
};
const query = (template = "minimal") =>
	normalizeOgParams(
		new URLSearchParams({ template, name: "Query Name", bio: "Query bio", theme: "#abcdef" }),
	);
const request = (template = "minimal", cookie?: string) =>
	new NextRequest(
		`${origin}/og?${canonicalOgSearch(query(template), "")}`,
		cookie ? { headers: { cookie } } : undefined,
	);
beforeEach(() => {
	api.rendered.length = 0;
	api.page.mockReset().mockResolvedValue(page);
	api.limit.mockReset().mockResolvedValue({ success: true });
	api.session.mockReset().mockResolvedValue(new Response(JSON.stringify({ session: null })));
	vi.stubGlobal("caches", undefined);
});
afterEach(() => vi.unstubAllGlobals());

describe("shared OG templates and live route preservation", () => {
	it.each(["minimal", "gradient", "bold", "profile"])(
		"uses the exact shared %s presentation for anonymous stored content",
		async (template) => {
			const response = await GET(request(template));
			expect(response.status).toBe(200);
			expect(api.rendered).toHaveLength(1);
			const expected = ogContentFromPage(page, template, origin, new Set([origin]));
			const markup = renderToStaticMarkup(api.rendered[0]!.element);
			expect(markup).toBe(renderToStaticMarkup(renderOgTemplate(expected.params, "")));
			expect(markup).toContain("Stored &lt;b&gt;Wolf&lt;/b&gt;");
			expect(markup).not.toContain("Query Name");
			expect(markup).not.toContain("<b>Wolf</b>");
			expect(api.rendered[0]!.options).toEqual(OG_IMAGE_SIZE);
			expect(response.headers.get("Cache-Control")).toContain("s-maxage=604800");
		},
	);

	it("canonicalizes before auth, database or rendering work", async () => {
		const response = await GET(new NextRequest(`${origin}/og`));
		expect(response.status).toBe(307);
		expect(api.page).not.toHaveBeenCalled();
		expect(api.session).not.toHaveBeenCalled();
		expect(api.limit).not.toHaveBeenCalled();
		expect(api.rendered).toEqual([]);
	});

	it("requires a validated session before rendering uncached query-supplied preview content", async () => {
		const response = await GET(request("bold", "better-auth.session_token=forged"));
		expect(renderToStaticMarkup(api.rendered[0]!.element)).toContain(
			"Stored &lt;b&gt;Wolf&lt;/b&gt;",
		);
		expect(response.headers.get("Cache-Control")).toContain("public");
		api.rendered.length = 0;
		api.page.mockClear();
		api.session.mockResolvedValue(new Response(JSON.stringify({ session: { id: "valid" } })));
		const preview = await GET(request("bold", "better-auth.session_token=valid"));
		expect(renderToStaticMarkup(api.rendered[0]!.element)).toContain("Query Name");
		expect(preview.headers.get("Cache-Control")).toBe("private, no-store");
		expect(api.page).not.toHaveBeenCalled();
	});

	it("keeps the existing limiter and cache-hit bypass", async () => {
		api.limit.mockResolvedValue({ success: false });
		expect((await GET(request())).status).toBe(429);
		expect(api.page).not.toHaveBeenCalled();
		expect(api.rendered).toEqual([]);
		api.limit.mockClear();
		vi.stubGlobal("caches", {
			default: { match: vi.fn(async () => new Response("Cached image")) },
		});
		expect(await (await GET(request())).text()).toBe("Cached image");
		expect(api.limit).not.toHaveBeenCalled();
		expect(api.rendered).toEqual([]);
	});
});

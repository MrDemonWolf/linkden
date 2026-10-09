import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import type { ComponentProps } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const trackViewFn = vi.fn();

vi.mock("@linkden/env/web", () => ({
	env: {
		NEXT_PUBLIC_SERVER_URL: "https://api.linkden.test",
		NEXT_PUBLIC_SITE_URL: "https://linkden.test",
	},
}));
vi.mock("@/utils/trpc", () => ({
	trpc: {
		public: {
			trackView: { mutationOptions: () => ({ mutationFn: trackViewFn }) },
			submitContact: { mutationOptions: () => ({ mutationFn: vi.fn() }) },
		},
	},
}));

import { getThemeColors } from "@/lib/theme-colors";
import { PublicPage } from "../public-page";

type Data = ComponentProps<typeof PublicPage>["data"];

function pageData(settings: Partial<Data["settings"]> = {}): Data {
	return {
		profile: { name: "Ada", image: null, bio: null, isVerified: false },
		blocks: [],
		socialNetworks: [],
		settings: {
			seoTitle: null,
			seoDescription: null,
			seoOgImage: null,
			brandingEnabled: false,
			brandingText: "",
			defaultColorMode: "light",
			vcardEnabled: false,
			contactFormEnabled: false,
			captchaProvider: "none",
			captchaSiteKey: null,
			bannerPreset: null,
			bannerEnabled: false,
			themePreset: "default",
			customPrimary: null,
			customSecondary: null,
			customAccent: null,
			customBackground: null,
			customCss: null,
			socialIconShape: null,
			consentBannerEnabled: true,
			...settings,
		},
	};
}

function renderPage(data: Data, props: Partial<ComponentProps<typeof PublicPage>> = {}) {
	const client = new QueryClient();
	return render(
		<QueryClientProvider client={client}>
			<PublicPage data={data} initialColorMode="light" {...props} />
		</QueryClientProvider>,
	);
}

const grant = (analytics: boolean) =>
	act(() => {
		window.dispatchEvent(
			new CustomEvent("linkden:consent", {
				detail: { essential: true, analytics, marketing: false, functional: false },
			}),
		);
	});

describe("PublicPage page-view tracking", () => {
	beforeEach(() => {
		localStorage.clear();
		trackViewFn.mockReset();
		trackViewFn.mockResolvedValue({ success: true });
	});
	afterEach(cleanup);

	// mutate() runs the mutation on a later tick.
	const settle = () => act(() => new Promise((r) => setTimeout(r, 20)));

	it("counts a first visit once the visitor accepts analytics — and only once", async () => {
		renderPage(pageData());
		await settle();
		expect(trackViewFn).not.toHaveBeenCalled();
		grant(true);
		grant(true);
		await waitFor(() => expect(trackViewFn).toHaveBeenCalled());
		await settle();
		expect(trackViewFn).toHaveBeenCalledOnce();
	});

	it("doesn't count a visitor who declines", async () => {
		renderPage(pageData());
		grant(false);
		await settle();
		expect(trackViewFn).not.toHaveBeenCalled();
	});

	it("counts on load when there is no consent gate", async () => {
		renderPage(pageData({ consentBannerEnabled: false }));
		await waitFor(() => expect(trackViewFn).toHaveBeenCalledOnce());
	});

	it("never tracks the admin preview", async () => {
		renderPage(pageData({ consentBannerEnabled: false }), { previewMode: "light" });
		grant(true);
		await settle();
		expect(trackViewFn).not.toHaveBeenCalled();
	});
});

describe("PublicPage chrome", () => {
	afterEach(cleanup);

	it("offers 'Cookie settings' in the footer while the consent banner is on", () => {
		renderPage(pageData());
		expect(screen.getByRole("button", { name: "Cookie settings" })).toBeTruthy();
	});

	it("marks the page language when it is a valid BCP-47 tag", () => {
		document.documentElement.lang = "en";
		const { container, unmount } = renderPage(pageData({ siteLanguage: "de-AT" }));
		expect(container.querySelector('[lang="de-AT"]')).not.toBeNull();
		expect(document.documentElement.lang).toBe("de-AT");
		unmount();
		expect(document.documentElement.lang).toBe("en");
		const bad = renderPage(pageData({ siteLanguage: '"><script>' }));
		expect(bad.container.querySelector("[lang]")).toBeNull();
	});

	it("adopts the pre-paint colour mode instantly (no fade from the server's guess)", async () => {
		document.documentElement.dataset.ldMode = "dark";
		const { container } = renderPage(pageData({ defaultColorMode: "system" }));
		const wrapper = container.firstElementChild as HTMLElement;
		const dark = getThemeColors("default", "dark").bg;
		await waitFor(() =>
			expect(wrapper.style.backgroundColor).toBe(
				// jsdom normalises hex to rgb()
				(() => {
					const probe = document.createElement("div");
					probe.style.backgroundColor = dark;
					return probe.style.backgroundColor;
				})(),
			),
		);
		await waitFor(() =>
			expect(
				[...document.head.querySelectorAll("style")].some((s) =>
					s.textContent?.startsWith("*,*::before,*::after{transition:none"),
				),
			).toBe(false),
		);
		delete document.documentElement.dataset.ldMode;
	});
});

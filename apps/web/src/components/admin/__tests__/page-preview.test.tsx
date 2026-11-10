import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ComponentProps, ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { PublicPage } from "@/components/public/public-page";
import { PagePreview, type PreviewBlock } from "../page-preview";

const api = vi.hoisted(() => ({ page: vi.fn(), blocks: vi.fn() }));
vi.mock("@linkden/env/web", () => ({ env: { NEXT_PUBLIC_SITE_URL: "https://public.example" } }));
vi.mock("@/components/admin/page-preview-viewport", () => ({
	PagePreviewViewport: ({ children }: { children: ReactNode }) => children,
}));
vi.mock("@/components/ui/tooltip", () => ({
	TooltipHint: ({ children }: { children: ReactNode }) => children,
}));
vi.mock("@/components/public/public-page", () => ({
	PublicPage: (props: unknown) => <output data-testid="page">{JSON.stringify(props)}</output>,
}));
vi.mock("@/utils/trpc", () => ({
	trpc: {
		public: {
			getPage: {
				queryOptions: () => ({ queryKey: [["public", "getPage"]], queryFn: api.page }),
				queryKey: () => [["public", "getPage"]],
			},
		},
		blocks: {
			list: { queryOptions: () => ({ queryKey: [["blocks", "list"]], queryFn: api.blocks }) },
		},
	},
}));

type Data = ComponentProps<typeof PublicPage>["data"];
function page(): Data {
	return {
		profile: { name: "Ada", image: null, bio: "Saved", isVerified: false },
		blocks: [],
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
		},
	};
}
function block(
	id: string,
	type = "link",
	isEnabled = true,
	status: "draft" | "published" = "published",
): PreviewBlock & { isEnabled: boolean; status: "draft" | "published" } {
	return {
		id,
		type,
		isEnabled,
		status,
		title: id,
		url: "https://example.com",
		icon: null,
		embedType: null,
		embedUrl: null,
		socialIcons: null,
		config: null,
		position: 0,
	};
}
const rendered = () =>
	JSON.parse(screen.getByTestId("page").textContent ?? "{}") as { data: Data; previewMode: string };
function mount(props: ComponentProps<typeof PagePreview> = {}) {
	const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
	render(
		<QueryClientProvider client={client}>
			<PagePreview {...props} />
		</QueryClientProvider>,
	);
	return client;
}
beforeEach(() => {
	api.page.mockReset().mockResolvedValue(page());
	api.blocks.mockReset().mockResolvedValue([]);
});
afterEach(cleanup);

describe("honest shared page preview", () => {
	it("uses labelled sample content only when the inventory is empty", async () => {
		mount();
		await screen.findByText("Sample content · no blocks yet");
		expect(rendered().data.blocks[0]?.id).toBe("sample-header");
	});
	it("shows the real empty page after all existing blocks are disabled", async () => {
		api.blocks.mockResolvedValue([block("disabled", "link", false)]);
		mount();
		await screen.findByText("No visible blocks");
		expect(rendered().data.blocks).toEqual([]);
		expect(screen.queryByText("Sample")).toBeNull();
	});
	it("keeps feature-gated overrides hidden and identifies visible block drafts", async () => {
		const inventory = [block("contact", "connect"), block("draft", "link", true, "draft")];
		api.blocks.mockResolvedValue(inventory);
		mount({ overrides: { blocks: inventory } });
		await screen.findByText("Includes block drafts");
		expect(rendered().data.blocks.map((b) => b.id)).toEqual(["draft"]);
	});
	it("does not replace the only feature-gated block with sample links", async () => {
		api.blocks.mockResolvedValue([block("contact", "connect")]);
		mount();
		await screen.findByText("No visible blocks");
		expect(rendered().data.blocks).toEqual([]);
	});
	it("refreshes saved vCard feature changes while preserving unsaved overrides", async () => {
		const client = mount({ overrides: { profile: { bio: "Unsaved draft" } } });
		await screen.findByText("Sample content · no blocks yet");
		client.setQueryData([["vcard", "getConfig"]], { enabled: false });
		api.page.mockResolvedValue({ ...page(), settings: { ...page().settings, vcardEnabled: true } });
		await act(() => client.invalidateQueries({ queryKey: [["vcard", "getConfig"]] }));
		await waitFor(() => expect(rendered().data.settings.vcardEnabled).toBe(true));
		expect(rendered().data.profile.bio).toBe("Unsaved draft");
	});
	it("keeps mode controls and draft availability without the duplicate mobile heading", async () => {
		api.blocks.mockResolvedValue([block("draft", "link", true, "draft")]);
		const onModeChange = vi.fn();
		mount({ headerLabel: null, onModeChange });
		await screen.findByText("Includes block drafts");
		fireEvent.click(screen.getByRole("button", { name: "Dark preview" }));
		expect(onModeChange).toHaveBeenCalledWith("dark");
		expect(rendered().previewMode).toBe("dark");
		expect(screen.getByRole("button", { name: "Dark preview" }).getAttribute("aria-pressed")).toBe(
			"true",
		);
	});
});

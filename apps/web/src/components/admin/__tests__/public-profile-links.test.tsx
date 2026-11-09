import "@testing-library/jest-dom/vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const api = vi.hoisted(() => ({ clipboard: vi.fn(), share: vi.fn(), qr: vi.fn() }));
vi.mock("@linkden/env/web", () => ({
	env: {
		NEXT_PUBLIC_SERVER_URL: "https://admin.example",
		NEXT_PUBLIC_SITE_URL: "https://public.example",
	},
}));
vi.mock("qrcode", () => ({ default: { toDataURL: api.qr } }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock("@/components/public/public-page", () => ({ PublicPage: () => null }));
vi.mock("@/components/admin/page-preview-viewport", () => ({
	PagePreviewViewport: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));
vi.mock("@/utils/trpc", () => ({
	trpc: {
		public: {
			getPage: {
				queryOptions: () => ({
					queryKey: ["public", "getPage"],
					queryFn: async () => ({
						profile: null,
						settings: { defaultColorMode: "light" },
						blocks: [],
						socialNetworks: [],
					}),
				}),
				queryKey: () => ["public", "getPage"],
			},
		},
		blocks: {
			list: { queryOptions: () => ({ queryKey: ["blocks", "list"], queryFn: async () => [] }) },
		},
	},
}));

import { PagePreview } from "../page-preview";
import { SharePopover } from "../share-popover";

const originalClipboard = Object.getOwnPropertyDescriptor(navigator, "clipboard");
const originalShare = Object.getOwnPropertyDescriptor(navigator, "share");
beforeEach(() => {
	vi.clearAllMocks();
	api.clipboard.mockResolvedValue(undefined);
	api.share.mockResolvedValue(undefined);
	api.qr.mockResolvedValue("data:image/png;base64,AA==");
	Object.defineProperty(navigator, "clipboard", {
		configurable: true,
		value: { writeText: api.clipboard },
	});
	Object.defineProperty(navigator, "share", { configurable: true, value: api.share });
});
afterEach(() => {
	cleanup();
	if (originalClipboard) Object.defineProperty(navigator, "clipboard", originalClipboard);
	else Reflect.deleteProperty(navigator, "clipboard");
	if (originalShare) Object.defineProperty(navigator, "share", originalShare);
	else Reflect.deleteProperty(navigator, "share");
});

describe("public links from a separate admin origin", () => {
	it("uses the configured public URL for sharing, copying and QR codes", async () => {
		render(<SharePopover />);
		fireEvent.click(screen.getByRole("button", { name: "Share your page" }));
		fireEvent.click(await screen.findByRole("button", { name: "Copy link" }));
		await waitFor(() => expect(api.clipboard).toHaveBeenCalledWith("https://public.example"));
		fireEvent.click(screen.getByRole("button", { name: "Share…" }));
		await waitFor(() => expect(api.share).toHaveBeenCalledWith({ url: "https://public.example" }));
		expect(api.qr).toHaveBeenCalledWith("https://public.example", expect.anything());
	});

	it("opens and copies the public profile from the editor preview", async () => {
		const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
		render(
			<QueryClientProvider client={client}>
				<PagePreview />
			</QueryClientProvider>,
		);
		expect(screen.getByLabelText("Open live page")).toHaveAttribute(
			"href",
			"https://public.example",
		);
		fireEvent.click(screen.getByRole("button", { name: "Copy live page link" }));
		await waitFor(() => expect(api.clipboard).toHaveBeenCalledWith("https://public.example"));
	});
});

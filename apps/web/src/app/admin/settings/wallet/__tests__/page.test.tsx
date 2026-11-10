import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const api = vi.hoisted(() => ({
	config: vi.fn(),
	preview: vi.fn(),
	signing: vi.fn(),
	update: vi.fn(),
}));
const previewSlot = vi.hoisted(() => vi.fn());
vi.mock("@linkden/env/web", () => ({ env: { NEXT_PUBLIC_SITE_URL: "https://example.com" } }));
vi.mock("@/utils/trpc", () => ({
	trpc: {
		wallet: {
			getConfig: { queryOptions: () => ({ queryKey: ["wallet", "config"], queryFn: api.config }) },
			generatePreview: {
				queryOptions: () => ({ queryKey: ["wallet", "preview"], queryFn: api.preview }),
			},
			getSigningStatus: {
				queryOptions: () => ({ queryKey: ["wallet", "signing"], queryFn: api.signing }),
			},
			updateConfig: { mutationOptions: () => ({ mutationFn: api.update }) },
		},
	},
}));
vi.mock("@/components/admin/preview-slot", () => ({ usePreviewSlot: previewSlot }));
vi.mock("@/components/admin/wallet/wallet-builder-section", () => ({
	WalletBuilderSection: () => null,
}));
vi.mock("@/components/admin/wallet/signing-keys-section", () => ({
	SigningKeysSection: () => null,
}));
vi.mock("@/components/admin/wallet-pass-preview", () => ({
	WalletPassPreview: () => <div>Pass preview</div>,
}));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import WalletSettingsPage from "../page";

let client: QueryClient;
const ready = { signerCert: true, signerKey: true, wwdrCert: true, teamId: true, passTypeId: true };

beforeEach(() => {
	vi.clearAllMocks();
	api.config.mockReset().mockResolvedValue({ wallet_pass_enabled: "true" });
	api.preview.mockReset().mockResolvedValue({});
	api.signing.mockReset().mockResolvedValue(ready);
	api.update.mockReset().mockResolvedValue({ success: true });
	client = new QueryClient({
		defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
	});
});
afterEach(() => {
	cleanup();
	client.clear();
});

function renderPage() {
	return render(
		<QueryClientProvider client={client}>
			<WalletSettingsPage />
		</QueryClientProvider>,
	);
}

describe("Wallet availability", () => {
	it("keeps unknown downloads disabled and distinguishes a pending signing check", () => {
		api.config.mockImplementation(() => new Promise(() => {}));
		api.signing.mockImplementation(() => new Promise(() => {}));
		renderPage();
		expect(screen.getByText("Checking setup")).toBeTruthy();
		expect(screen.queryByText("Setup required")).toBeNull();
		expect(screen.getByRole("switch")).toHaveAttribute("aria-disabled", "true");
		fireEvent.click(screen.getByRole("switch"));
		expect(api.update).not.toHaveBeenCalled();
		expect(screen.queryByRole("link", { name: "Download pass" })).toBeNull();
	});

	it("shows unavailable on failure, blocks retained download state, and recovers on retry", async () => {
		client.setQueryData(["wallet", "config"], { wallet_pass_enabled: "true" });
		client.setQueryData(["wallet", "signing"], ready);
		api.config.mockRejectedValueOnce(new Error("Network unavailable"));
		api.signing.mockRejectedValueOnce(new Error("Network unavailable"));
		renderPage();
		expect(await screen.findByText("Unavailable")).toBeTruthy();
		expect(screen.getByRole("alert").textContent).toContain(
			"Couldn't check Wallet download availability",
		);
		expect(screen.getByRole("switch")).toHaveAttribute("aria-disabled", "true");
		expect(screen.queryByRole("link", { name: "Download pass" })).toBeNull();
		fireEvent.click(screen.getByRole("switch"));
		expect(api.update).not.toHaveBeenCalled();

		fireEvent.click(screen.getByRole("button", { name: "Retry" }));
		expect(await screen.findByText("Ready")).toBeTruthy();
		await waitFor(() =>
			expect(screen.getByRole("switch")).not.toHaveAttribute("aria-disabled", "true"),
		);
		expect(screen.getByRole("link", { name: "Download pass" })).toBeTruthy();
		fireEvent.click(screen.getByRole("switch"));
		await waitFor(() =>
			expect(api.update).toHaveBeenCalledWith({ enabled: false }, expect.anything()),
		);
	});

	it("offers a preview retry instead of displaying a fabricated pass after a preview failure", async () => {
		api.preview.mockRejectedValueOnce(new Error("Network unavailable"));
		renderPage();
		await waitFor(() => expect(client.getQueryState(["wallet", "preview"])?.status).toBe("error"));
		const preview = previewSlot.mock.lastCall?.[0]?.preview;
		render(preview);
		expect(screen.getByRole("alert").textContent).toContain("Couldn't load your Wallet preview");
		expect(screen.queryByText("Pass preview")).toBeNull();
		fireEvent.click(screen.getByRole("button", { name: "Retry" }));
		await waitFor(() =>
			expect(client.getQueryState(["wallet", "preview"])?.status).toBe("success"),
		);
		expect(api.preview).toHaveBeenCalledTimes(2);
	});
});

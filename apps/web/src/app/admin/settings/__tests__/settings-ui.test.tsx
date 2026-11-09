import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const api = vi.hoisted(() => ({ getAll: vi.fn(), updateBulk: vi.fn() }));
vi.mock("@/utils/trpc", () => ({
	trpc: {
		settings: {
			getAll: { queryOptions: () => ({ queryKey: ["settings"], queryFn: api.getAll }) },
			updateBulk: { mutationOptions: () => ({ mutationFn: api.updateBulk }) },
		},
	},
}));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import EmailSettingsPage from "../email/page";
import IntegrationsSettingsPage from "../integrations/page";

function renderPage(page: React.ReactNode) {
	const client = new QueryClient({
		defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
	});
	return render(<QueryClientProvider client={client}>{page}</QueryClientProvider>);
}

beforeEach(() => {
	api.getAll.mockReset();
	api.updateBulk.mockReset().mockResolvedValue({ success: true });
});
afterEach(cleanup);

describe("supported Settings controls", () => {
	it.each(["resend", ""])(
		"shows the supported email provider for %j without a disabled future-provider choice",
		async (emailProvider) => {
			api.getAll.mockResolvedValue({ email_provider: emailProvider });
			renderPage(<EmailSettingsPage />);
			expect(await screen.findByText("Resend")).toBeTruthy();
			expect(screen.getByLabelText("API Key")).toBeTruthy();
			expect(screen.getByLabelText("API Key").getAttribute("placeholder")).toBe("re_...");
			expect(screen.getByLabelText("From Address")).toBeTruthy();
			expect(screen.queryByText(/Cloudflare Email Workers|coming soon/i)).toBeNull();
			expect(screen.queryByRole("button", { name: "Use Resend" })).toBeNull();
			expect(api.updateBulk).not.toHaveBeenCalled();
		},
	);

	it("keeps a legacy provider on an unrelated email save until the admin explicitly switches", async () => {
		api.getAll.mockResolvedValue({ email_provider: "cloudflare", email_from: "old@example.com" });
		renderPage(<EmailSettingsPage />);
		fireEvent.change(await screen.findByLabelText("From Address"), {
			target: { value: "new@example.com" },
		});
		fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
		await waitFor(() => expect(api.updateBulk).toHaveBeenCalledTimes(1));
		expect(api.updateBulk.mock.calls[0]?.[0]).toEqual([
			{ key: "email_from", value: "new@example.com" },
		]);
		await waitFor(() => expect(screen.queryByRole("button", { name: "Save changes" })).toBeNull());
		fireEvent.click(screen.getByRole("button", { name: "Use Resend" }));
		fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
		await waitFor(() => expect(api.updateBulk).toHaveBeenCalledTimes(2));
		expect(api.updateBulk.mock.calls[1]?.[0]).toEqual([{ key: "email_provider", value: "resend" }]);
	});

	it("saves only CAPTCHA changes while retaining hidden legacy MapKit configuration", async () => {
		api.getAll.mockResolvedValue({
			captcha_provider: "turnstile",
			captcha_site_key: "old-site-key",
			captcha_secret_key: "••••••",
			mapkit_enabled: "true",
			mapkit_token: "retained-token".repeat(100),
		});
		renderPage(<IntegrationsSettingsPage />);
		fireEvent.change(await screen.findByLabelText("Site Key"), {
			target: { value: "new-site-key" },
		});
		expect(screen.queryByText(/MapKit|Apple Maps/)).toBeNull();
		fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
		await waitFor(() => expect(api.updateBulk).toHaveBeenCalledTimes(1));
		expect(api.updateBulk.mock.calls[0]?.[0]).toEqual([
			{ key: "captcha_site_key", value: "new-site-key" },
		]);
	});
});

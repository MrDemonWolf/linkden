import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const api = vi.hoisted(() => ({ getConfig: vi.fn(), updateConfig: vi.fn() }));
const toast = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }));

vi.mock("@/utils/trpc", () => ({
	trpc: {
		vcard: {
			getConfig: { queryOptions: () => ({ queryKey: ["vcard"], queryFn: api.getConfig }) },
			updateConfig: { mutationOptions: () => ({ mutationFn: api.updateConfig }) },
		},
	},
}));
vi.mock("sonner", () => ({ toast }));

import { VCardSection } from "../vcard-section";

function renderSection() {
	const client = new QueryClient({
		defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
	});
	return render(
		<QueryClientProvider client={client}>
			<VCardSection />
		</QueryClientProvider>,
	);
}

describe("VCardSection", () => {
	beforeEach(() => {
		api.updateConfig.mockResolvedValue({ success: true });
	});
	afterEach(() => {
		cleanup();
		vi.clearAllMocks();
	});

	it("shows a retry state, not an editable empty form, when the config fails to load", async () => {
		api.getConfig.mockRejectedValue(new Error("offline"));
		renderSection();
		expect(await screen.findByText("Couldn't load your vCard settings")).toBeTruthy();
		expect(screen.queryByRole("switch", { name: "Enable vCard" })).toBeNull();
	});

	it("turning vCard off saves only the flag, even with an invalid hidden field", async () => {
		api.getConfig.mockResolvedValue({ enabled: true, data: { fullName: "Wolf" } });
		renderSection();
		fireEvent.change(await screen.findByLabelText("Personal Email"), { target: { value: "me@" } });
		fireEvent.click(screen.getByRole("switch", { name: "Enable vCard" }));
		fireEvent.click(screen.getByRole("button", { name: /Save vCard Settings/ }));
		await waitFor(() => expect(api.updateConfig).toHaveBeenCalled());
		expect(api.updateConfig.mock.calls[0]?.[0]).toEqual({ enabled: false });
		expect(toast.success).toHaveBeenCalledWith("vCard settings saved");
	});

	it("flags an over-long phone number inline", async () => {
		api.getConfig.mockResolvedValue({ enabled: true, data: { phone: "1".repeat(41) } });
		renderSection();
		const phone = await screen.findByLabelText("Personal Phone");
		expect(phone.getAttribute("aria-invalid")).toBe("true");
		expect(await screen.findByText(/Too long \(max 40 characters\)/)).toBeTruthy();
	});
});

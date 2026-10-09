import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { MutableRefObject } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const api = vi.hoisted(() => ({ getConfig: vi.fn(), updateConfig: vi.fn() }));
const toast = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }));

vi.mock("@/utils/trpc", () => ({
	trpc: {
		wallet: {
			getConfig: { queryOptions: () => ({ queryKey: ["getConfig"], queryFn: api.getConfig }) },
			generatePreview: { queryOptions: () => ({ queryKey: ["generatePreview"] }) },
			updateConfig: { mutationOptions: () => ({ mutationFn: api.updateConfig }) },
		},
	},
}));
vi.mock("sonner", () => ({ toast }));
// Image slots pull in the upload/crop stack, which these tests don't exercise.
vi.mock("../pass-image-slots", () => ({ PassImageSlots: () => null }));

import { WalletBuilderSection } from "../wallet-builder-section";

function renderBuilder(saveRef: MutableRefObject<(() => Promise<void>) | null>) {
	const client = new QueryClient({
		defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
	});
	return render(
		<QueryClientProvider client={client}>
			<WalletBuilderSection saveRef={saveRef} />
		</QueryClientProvider>,
	);
}

describe("WalletBuilderSection", () => {
	beforeEach(() => {
		api.updateConfig.mockResolvedValue({ success: true });
	});
	afterEach(() => {
		cleanup();
		vi.clearAllMocks();
	});

	it("doesn't crash on stored field/location JSON that isn't an array", async () => {
		api.getConfig.mockResolvedValue({
			wallet_header_fields: "{}",
			wallet_back_fields: "null",
			wallet_locations: '{"latitude":1}',
		});
		renderBuilder({ current: null });
		expect(await screen.findByRole("group", { name: "Header fields" })).toBeTruthy();
		expect(screen.getAllByText(/No fields yet/).length).toBeGreaterThan(0);
	});

	it("shows a retry state and never saves DEFAULTS when the config fails to load", async () => {
		api.getConfig.mockRejectedValue(new Error("offline"));
		const saveRef: MutableRefObject<(() => Promise<void>) | null> = { current: null };
		renderBuilder(saveRef);
		expect(await screen.findByText("Couldn't load your wallet pass design")).toBeTruthy();
		await act(async () => {
			await saveRef.current?.();
		});
		expect(api.updateConfig).not.toHaveBeenCalled();
	});

	it("blocks a save the server would reject and names the row", async () => {
		api.getConfig.mockResolvedValue({
			wallet_locations: JSON.stringify([{ latitude: 10, longitude: 10, relevantText: "" }]),
		});
		const saveRef: MutableRefObject<(() => Promise<void>) | null> = { current: null };
		renderBuilder(saveRef);
		const longitude = await screen.findByLabelText("Longitude");
		fireEvent.change(longitude, { target: { value: "200" } });
		expect(screen.getByText("Enter a longitude from -180 to 180")).toBeTruthy();
		await act(async () => {
			await saveRef.current?.();
		});
		expect(api.updateConfig).not.toHaveBeenCalled();
		expect(toast.error).toHaveBeenCalledWith("Location 1: enter a longitude from -180 to 180");

		fireEvent.change(longitude, { target: { value: "-122.4" } });
		await act(async () => {
			await saveRef.current?.();
		});
		expect(api.updateConfig).toHaveBeenCalledTimes(1);
		expect(api.updateConfig.mock.calls[0]?.[0]).toMatchObject({
			locations: [{ latitude: 10, longitude: -122.4, relevantText: "" }],
		});
	});
});

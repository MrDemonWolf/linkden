import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const listFn = vi.fn();
const updateFn = vi.fn();

vi.mock("@/utils/trpc", () => ({
	trpc: {
		social: {
			list: { queryOptions: () => ({ queryKey: [["social", "list"]], queryFn: listFn }) },
			updateBulk: { mutationOptions: () => ({ mutationFn: updateFn }) },
		},
	},
}));
vi.mock("next-themes", () => ({ useTheme: () => ({ resolvedTheme: "light" }) }));

import { SocialTab } from "../social-tab";

function renderTab(onDirtyChange: (dirty: boolean) => void) {
	const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
	return render(
		<QueryClientProvider client={client}>
			<SocialTab onDirtyChange={onDirtyChange} />
		</QueryClientProvider>,
	);
}

// Full-component renders with userEvent are slow under V8 coverage + parallel workers.
describe("SocialTab", { timeout: 30_000 }, () => {
	beforeEach(() => {
		listFn.mockReset();
		updateFn.mockReset();
	});
	// Vitest runs without globals, so RTL can't register its own cleanup.
	afterEach(cleanup);

	it("shows a retry state on a failed load, then the saved rows — never a delete", async () => {
		listFn
			.mockRejectedValueOnce(new Error("D1 unavailable"))
			.mockResolvedValue([{ slug: "github", url: "https://github.com/me", isActive: true }]);
		const onDirtyChange = vi.fn();
		renderTab(onDirtyChange);

		const retry = await screen.findByRole("button", { name: /retry/i });
		expect(screen.queryByText("No social links yet")).toBeNull();
		fireEvent.click(retry);

		expect(await screen.findByLabelText("URL for GitHub")).toBeTruthy();
		await waitFor(() => expect(onDirtyChange).toHaveBeenLastCalledWith(false));
		expect(screen.queryByRole("button", { name: /save social links/i })).toBeNull();
		expect(updateFn).not.toHaveBeenCalled();
	});

	it("keeps a row listed (and blocks Save) when its URL is cleared mid-edit", async () => {
		listFn.mockResolvedValue([{ slug: "github", url: "https://github.com/me", isActive: true }]);
		const onDirtyChange = vi.fn();
		renderTab(onDirtyChange);

		fireEvent.change(await screen.findByLabelText("URL for GitHub"), { target: { value: "" } });
		expect(screen.getByLabelText("URL for GitHub")).toBeTruthy();
		expect(screen.getByText("Enter a URL, or remove GitHub.")).toBeTruthy();
		const save = screen.getByRole("button", { name: /save social links/i }) as HTMLButtonElement;
		expect(save.disabled).toBe(true);
		await waitFor(() => expect(onDirtyChange).toHaveBeenLastCalledWith(true));
	});
});

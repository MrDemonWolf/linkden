import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
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

import { type SocialLive, SocialTab } from "../social-tab";

function renderTab(
	onDirtyChange: (dirty: boolean) => void,
	onLiveChange?: (networks: SocialLive[] | null) => void,
) {
	const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
	return render(
		<QueryClientProvider client={client}>
			<SocialTab onDirtyChange={onDirtyChange} onLiveChange={onLiveChange} />
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
		expect(screen.queryByRole("button", { name: "Save changes" })).toBeNull();
		expect(updateFn).not.toHaveBeenCalled();
	});

	it("keeps a row listed (and blocks Save) when its URL is cleared mid-edit", async () => {
		listFn.mockResolvedValue([{ slug: "github", url: "https://github.com/me", isActive: true }]);
		const onDirtyChange = vi.fn();
		renderTab(onDirtyChange);

		fireEvent.change(await screen.findByLabelText("URL for GitHub"), { target: { value: "" } });
		expect(screen.getByLabelText("URL for GitHub")).toBeTruthy();
		expect(screen.getByText("Enter a URL, or remove GitHub.")).toBeTruthy();
		const save = screen.getByRole("button", { name: "Save changes" }) as HTMLButtonElement;
		expect(save.disabled).toBe(true);
		expect(screen.getByRole("status").textContent).toBe("Fix the highlighted fields to save");
		fireEvent.click(save);
		expect(updateFn).not.toHaveBeenCalled();
		await waitFor(() => expect(onDirtyChange).toHaveBeenLastCalledWith(true));
	});

	it("uses shared discard and pending save behavior while preserving dirty and live overlays", async () => {
		listFn.mockResolvedValue([{ slug: "github", url: "https://github.com/me", isActive: true }]);
		let finishSave = () => {};
		updateFn.mockImplementation(
			() =>
				new Promise<void>((resolve) => {
					finishSave = resolve;
				}),
		);
		const dirty = vi.fn();
		const live = vi.fn();
		renderTab(dirty, live);
		const input = await screen.findByLabelText("URL for GitHub");
		fireEvent.change(input, { target: { value: "discard-me" } });
		await waitFor(() => expect(dirty).toHaveBeenLastCalledWith(true));
		expect(live.mock.lastCall?.[0]).toEqual([
			expect.objectContaining({ slug: "github", url: "https://github.com/discard-me" }),
		]);
		fireEvent.click(screen.getByRole("button", { name: "Discard" }));
		expect((input as HTMLInputElement).value).toBe("me");
		await waitFor(() => expect(dirty).toHaveBeenLastCalledWith(false));
		expect(live).toHaveBeenLastCalledWith(null);
		expect(screen.queryByRole("button", { name: "Save changes" })).toBeNull();
		expect(updateFn).not.toHaveBeenCalled();

		fireEvent.change(input, { target: { value: "saved" } });
		const add = screen.getByRole("button", { name: /^Instagram/ });
		const remove = screen.getByRole("button", { name: "Remove GitHub" });
		fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
		const saving = await screen.findByRole("button", { name: "Saving…" });
		expect((saving as HTMLButtonElement).disabled).toBe(true);
		const discard = screen.getByRole("button", { name: "Discard" });
		expect((discard as HTMLButtonElement).disabled).toBe(true);
		for (const control of [input, add, remove]) expect(control.matches(":disabled")).toBe(true);
		fireEvent.click(discard);
		expect((input as HTMLInputElement).value).toBe("saved");
		expect(updateFn.mock.calls[0]?.[0]).toEqual([
			{ slug: "github", url: "https://github.com/saved", isActive: true },
		]);
		let finishRefetch = () => {};
		listFn.mockImplementationOnce(
			() =>
				new Promise((resolve) => {
					finishRefetch = () =>
						resolve([{ slug: "github", url: "https://github.com/saved", isActive: true }]);
				}),
		);
		await act(async () => finishSave());
		await waitFor(() => expect(listFn).toHaveBeenCalledTimes(2));
		expect(screen.getByRole("button", { name: "Saving…" })).toBeTruthy();
		for (const control of [input, add, remove]) expect(control.matches(":disabled")).toBe(true);
		await act(async () => finishRefetch());
		await waitFor(() => expect(screen.queryByRole("button", { name: "Save changes" })).toBeNull());
		expect((input as HTMLInputElement).value).toBe("saved");
		expect(dirty).toHaveBeenLastCalledWith(false);
		expect(live).toHaveBeenLastCalledWith(null);
		for (const control of [input, add, remove]) expect(control.matches(":disabled")).toBe(false);
	});
});

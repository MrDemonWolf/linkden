import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const KEY = [["settings", "getAll"]];
const getAll = vi.fn();
const updateBulk = vi.fn();

vi.mock("@/utils/trpc", () => ({
	trpc: {
		settings: {
			getAll: { queryOptions: () => ({ queryKey: KEY, queryFn: getAll }) },
			updateBulk: { mutationOptions: () => ({ mutationFn: updateBulk }) },
		},
	},
}));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import { useSettingsForm } from "../use-settings-form";

type Form = { text: string; link: string };
const parse = (d: Record<string, string>): Form => ({
	text: d.branding_text ?? "",
	link: d.branding_link ?? "",
});
const serialize = (f: Form) => [
	{ key: "branding_text" as const, value: f.text },
	{ key: "branding_link" as const, value: f.link },
];

function setup() {
	const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
	const hook = renderHook(() => useSettingsForm({ parse, serialize }), {
		wrapper: ({ children }) => (
			<QueryClientProvider client={client}>{children}</QueryClientProvider>
		),
	});
	return { client, ...hook };
}

describe("useSettingsForm", () => {
	beforeEach(() => {
		getAll.mockReset();
		updateBulk.mockReset().mockResolvedValue({ success: true });
	});
	afterEach(cleanup);

	it("keeps unsaved edits when fresh data arrives, and saves only what changed", async () => {
		getAll.mockResolvedValue({ branding_text: "Old footer", branding_link: "https://a.example" });
		const { client, result } = setup();
		await waitFor(() => expect(result.current.state).not.toBeNull());

		act(() => result.current.setState((s) => (s ? { ...s, link: "https://mine.example" } : s)));
		// Another tab saved the footer text; this tab refetches.
		act(() =>
			client.setQueryData(KEY, { branding_text: "New footer", branding_link: "https://a.example" }),
		);
		await waitFor(() =>
			expect(result.current.state).toEqual({ text: "New footer", link: "https://mine.example" }),
		);
		expect(result.current.isDirty).toBe(true);

		await act(() => result.current.save());
		// The untouched footer isn't written back (no revert of the other tab's save).
		expect(updateBulk.mock.calls[0][0]).toEqual([
			{ key: "branding_link", value: "https://mine.example" },
		]);
		expect(result.current.isDirty).toBe(false);
	});

	it("reports a failed load so pages can offer a retry", async () => {
		getAll.mockRejectedValueOnce(new Error("500"));
		const { result } = setup();
		await waitFor(() => expect(result.current.isError).toBe(true));
		expect(result.current.state).toBeNull();

		getAll.mockResolvedValue({ branding_text: "Hi" });
		await act(() => result.current.refetch());
		await waitFor(() => expect(result.current.state).toEqual({ text: "Hi", link: "" }));
		expect(result.current.isError).toBe(false);
	});
});

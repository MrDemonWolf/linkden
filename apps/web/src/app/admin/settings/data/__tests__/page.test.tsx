import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const api = vi.hoisted(() => ({ export: vi.fn() }));
const toast = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn(), warning: vi.fn() }));

vi.mock("@/utils/trpc", () => ({
	trpc: {
		version: {
			checkUpdate: {
				queryOptions: () => ({
					queryKey: ["version"],
					queryFn: async () => ({ status: "ok", current: "1.0.0", hasUpdate: false }),
				}),
			},
		},
		backup: {
			export: { queryOptions: () => ({ queryKey: ["backup", "export"], queryFn: api.export }) },
			import: { mutationOptions: () => ({ mutationFn: vi.fn() }) },
		},
		settings: { getAll: { queryOptions: () => ({ queryKey: ["settings"] }) } },
		danger: {
			deleteAllContent: { mutationOptions: () => ({ mutationFn: vi.fn() }) },
			resetEverything: { mutationOptions: () => ({ mutationFn: vi.fn() }) },
		},
	},
}));
vi.mock("sonner", () => ({ toast }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock("@/lib/auth-client", () => ({ authClient: { signOut: vi.fn() } }));
// The migration wizard has its own integration tests; keep this test on backup exports.
vi.mock("@/components/admin/settings/migration-section", () => ({ MigrationSection: () => null }));

import DataSettingsPage from "../page";

const originalCreate = Object.getOwnPropertyDescriptor(URL, "createObjectURL");
const originalRevoke = Object.getOwnPropertyDescriptor(URL, "revokeObjectURL");
const createObjectURL = vi.fn(() => "blob:backup");
const revokeObjectURL = vi.fn();
let client: QueryClient;

beforeEach(() => {
	vi.clearAllMocks();
	Object.defineProperty(URL, "createObjectURL", { configurable: true, value: createObjectURL });
	Object.defineProperty(URL, "revokeObjectURL", { configurable: true, value: revokeObjectURL });
	client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
});

afterEach(() => {
	cleanup();
	client.clear();
	vi.restoreAllMocks();
	for (const [key, descriptor] of [
		["createObjectURL", originalCreate],
		["revokeObjectURL", originalRevoke],
	] as const) {
		if (descriptor) Object.defineProperty(URL, key, descriptor);
		else Reflect.deleteProperty(URL, key);
	}
});

describe("Data backup export", () => {
	it("does not download retained cached data after a failed refetch, and allows retry", async () => {
		const firstBackup = { version: 1, data: { settings: { profile_name: "First profile" } } };
		const nextBackup = { version: 1, data: { settings: { profile_name: "Updated profile" } } };
		api.export
			.mockResolvedValueOnce(firstBackup)
			.mockRejectedValueOnce(new Error("Network unavailable"))
			.mockResolvedValueOnce(nextBackup);
		const download = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
		render(
			<QueryClientProvider client={client}>
				<DataSettingsPage />
			</QueryClientProvider>,
		);

		fireEvent.click(screen.getByRole("button", { name: "Export" }));
		await waitFor(() => expect(toast.success).toHaveBeenCalledWith("Export downloaded"));
		expect(download).toHaveBeenCalledTimes(1);
		expect(createObjectURL).toHaveBeenCalledTimes(1);
		expect(revokeObjectURL).toHaveBeenCalledWith("blob:backup");
		expect(client.getQueryData(["backup", "export"])).toEqual(firstBackup);

		fireEvent.click(await screen.findByRole("button", { name: "Export" }));
		await waitFor(() => expect(toast.error).toHaveBeenCalledWith("Failed to export"));
		// React Query retains the last successful backup on failure. The page must
		// throw before creating a download or showing another success notification.
		expect(client.getQueryData(["backup", "export"])).toEqual(firstBackup);
		expect(client.getQueryState(["backup", "export"])?.status).toBe("error");
		expect(download).toHaveBeenCalledTimes(1);
		expect(createObjectURL).toHaveBeenCalledTimes(1);
		expect(toast.success).toHaveBeenCalledTimes(1);

		fireEvent.click(await screen.findByRole("button", { name: "Export" }));
		await waitFor(() => expect(download).toHaveBeenCalledTimes(2));
		expect(api.export).toHaveBeenCalledTimes(3);
		expect(createObjectURL).toHaveBeenCalledTimes(2);
		expect(toast.success).toHaveBeenCalledTimes(2);
		expect(toast.error).toHaveBeenCalledTimes(1);
		expect(client.getQueryData(["backup", "export"])).toEqual(nextBackup);
	});
});

import { describe, expect, it, vi } from "vitest";

const toastError = vi.fn();
vi.mock("sonner", () => ({ toast: { error: (...args: unknown[]) => toastError(...args) } }));
vi.mock("@linkden/env/web", () => ({
	env: { NEXT_PUBLIC_SERVER_URL: "https://api.linkden.test" },
}));

import { queryClient } from "../trpc";

describe("global query-error toast", () => {
	it("'retry' refetches the failed query, whatever `this` Sonner binds", async () => {
		const queryFn = vi
			.fn()
			.mockRejectedValueOnce(new Error("API restarting"))
			.mockResolvedValue("ok");
		await queryClient
			.fetchQuery({ queryKey: ["settings", "getAll"], queryFn, retry: false })
			.catch(() => {});
		expect(toastError).toHaveBeenCalledWith("API restarting", expect.anything());

		const options = toastError.mock.calls[0]?.[1] as
			| { action: { onClick: (this: unknown, e: unknown) => void } }
			| undefined;
		const action = options?.action;
		if (!action) throw new Error("toast has no retry action");
		// Sonner calls `toast.action.onClick.call(toast.action, event)`.
		expect(() => action.onClick.call(action, {})).not.toThrow();
		await vi.waitFor(() => expect(queryClient.getQueryData(["settings", "getAll"])).toBe("ok"));
		expect(queryFn).toHaveBeenCalledTimes(2);
	});
});

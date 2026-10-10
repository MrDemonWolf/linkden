import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const auth = vi.hoisted(() => ({
	changeEmail: vi.fn(),
	enable: vi.fn(),
	user: { email: "admin@example.com", twoFactorEnabled: false } as Record<string, unknown>,
}));
const api = vi.hoisted(() => ({
	getAll: vi.fn(),
	get: vi.fn(),
	updateBulk: vi.fn(),
}));
const toast = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }));

vi.mock("@/lib/auth-client", () => ({
	authClient: {
		useSession: () => ({ data: { user: auth.user } }),
		changeEmail: auth.changeEmail,
		changePassword: vi.fn(),
		twoFactor: { enable: auth.enable, verifyTotp: vi.fn(), disable: vi.fn() },
	},
}));
vi.mock("@/utils/trpc", () => ({
	trpc: {
		settings: {
			getAll: { queryOptions: () => ({ queryKey: ["getAll"], queryFn: api.getAll }) },
			get: {
				queryOptions: (input: { key: string }) => ({
					queryKey: ["get", input.key],
					queryFn: () => api.get(input.key),
				}),
			},
			updateBulk: { mutationOptions: () => ({ mutationFn: api.updateBulk }) },
		},
	},
}));
vi.mock("sonner", () => ({ toast }));
vi.mock("@/components/public/shader-banner", () => ({ ShaderBanner: () => null }));

import { AccountTab } from "../account-tab";

function renderTab() {
	const client = new QueryClient({
		defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
	});
	return render(
		<QueryClientProvider client={client}>
			<AccountTab />
		</QueryClientProvider>,
	);
}

// Full-component renders with userEvent are slow under V8 coverage + parallel workers.
describe("AccountTab", { timeout: 30_000 }, () => {
	beforeEach(() => {
		auth.user = { email: "admin@example.com", twoFactorEnabled: false };
		api.getAll.mockResolvedValue({ email_api_key: "••••••", email_from: "me@example.com" });
		api.get.mockResolvedValue({ key: "magic_link_enabled", value: "false" });
		api.updateBulk.mockResolvedValue({ success: true });
	});
	afterEach(() => {
		cleanup();
		vi.clearAllMocks();
	});

	it("reports a refused email change instead of 'sent', and keeps the editor open", async () => {
		auth.changeEmail.mockResolvedValue({
			data: null,
			error: { message: "Email delivery is not configured." },
		});
		renderTab();
		// Email row comes first (the password row has its own "Change").
		const [changeEmail] = await screen.findAllByRole("button", { name: "Change" });
		fireEvent.click(changeEmail as HTMLElement);
		fireEvent.change(screen.getByLabelText("New email address"), {
			target: { value: "new@example.com" },
		});
		fireEvent.click(screen.getByRole("button", { name: "Send" }));

		await waitFor(() =>
			expect(toast.error).toHaveBeenCalledWith("Email delivery is not configured."),
		);
		expect(toast.success).not.toHaveBeenCalled();
		expect(screen.getByLabelText("New email address")).toBeTruthy();
	});

	it("reports a failed 2FA enable instead of silently stopping", async () => {
		auth.enable.mockResolvedValue({ data: null, error: { message: "Invalid password" } });
		renderTab();
		fireEvent.click(await screen.findByRole("switch", { name: "Two-factor authentication" }));
		fireEvent.change(screen.getByLabelText("Current password"), { target: { value: "wrong" } });
		fireEvent.click(screen.getByRole("button", { name: "Continue" }));
		await waitFor(() => expect(toast.error).toHaveBeenCalledWith("Invalid password"));
		expect(screen.queryByText("Scan with your authenticator app")).toBeNull();
	});

	it("won't turn magic links on without an email provider", async () => {
		api.getAll.mockResolvedValue({});
		renderTab();
		const toggle = await screen.findByRole("switch", { name: "Magic link sign-in" });
		await waitFor(() => expect(screen.getByText(/configure Email/)).toBeTruthy());
		expect(toggle.hasAttribute("data-disabled")).toBe(true);
	});

	it("won't turn magic links on while 2FA is on", async () => {
		auth.user = { email: "admin@example.com", twoFactorEnabled: true };
		renderTab();
		expect(
			await screen.findByText("Unavailable while two-factor authentication is on"),
		).toBeTruthy();
		expect(
			screen.getByRole("switch", { name: "Magic link sign-in" }).hasAttribute("data-disabled"),
		).toBe(true);
	});
});

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const auth = vi.hoisted(() => ({
	changeEmail: vi.fn(),
	changePassword: vi.fn(),
	enable: vi.fn(),
	verifyTotp: vi.fn(),
	disable: vi.fn(),
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
		changePassword: auth.changePassword,
		twoFactor: { enable: auth.enable, verifyTotp: auth.verifyTotp, disable: auth.disable },
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
// These tests exercise rejected auth transport, not the QR image renderer.
vi.mock("qrcode", () => ({ toDataURL: vi.fn(async () => "data:image/png;base64,fixture") }));

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
		for (const method of [
			auth.changeEmail,
			auth.changePassword,
			auth.enable,
			auth.verifyTotp,
			auth.disable,
		])
			method.mockReset();
		auth.user = { email: "admin@example.com", twoFactorEnabled: false };
		api.getAll.mockResolvedValue({ email_api_key: "••••••", email_from: "me@example.com" });
		api.get.mockResolvedValue({ key: "magic_link_enabled", value: "false" });
		api.updateBulk.mockResolvedValue({ success: true });
	});
	afterEach(() => {
		cleanup();
		vi.clearAllMocks();
	});

	it("shows current preferences without login customization controls", async () => {
		api.getAll.mockResolvedValue({
			branding_login_logo_url: "https://example.com/legacy-logo.png",
			branding_login_bg_mode: "custom",
			branding_login_bg_custom_url: "https://example.com/legacy-background.png",
		});
		renderTab();
		expect(await screen.findByRole("switch", { name: "Admin panel branding" })).toBeTruthy();
		expect(screen.getByText("Timezone")).toBeTruthy();
		expect(screen.queryByText("Login page")).toBeNull();
		expect(screen.queryByText("Login logo")).toBeNull();
		expect(screen.queryByText("Login background")).toBeNull();
	});

	it("reports a refused email change instead of 'sent', and keeps the editor open", async () => {
		auth.changeEmail.mockResolvedValue({
			data: null,
			error: { message: "Email delivery is not configured." },
		});
		renderTab();
		fireEvent.click(await screen.findByRole("button", { name: "Change email" }));
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

	it("doesn't treat an unrelated account update as a password-change date", async () => {
		auth.user.updatedAt = new Date().toISOString();
		renderTab();
		expect(
			await screen.findByText("Use a unique password with at least 8 characters"),
		).toBeTruthy();
		expect(screen.queryByText(/changed today|never changed|last changed/i)).toBeNull();
		const change = screen.getByRole("button", { name: "Change password" });
		expect(change.getAttribute("aria-expanded")).toBe("false");
		fireEvent.click(change);
		const close = screen.getByRole("button", { name: "Close password form" });
		expect(close.getAttribute("aria-expanded")).toBe("true");
		expect(document.getElementById(close.getAttribute("aria-controls") ?? "")).toBeTruthy();
		expect(screen.getByLabelText("Current password")).toBeTruthy();
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

	it("reports rejected password transport and preserves all entered values for retry", async () => {
		auth.changePassword.mockRejectedValue(new Error("PRIVATE_TRANSPORT_PAYLOAD"));
		renderTab();
		fireEvent.click(await screen.findByRole("button", { name: "Change password" }));
		fireEvent.change(screen.getByLabelText("Current password"), {
			target: { value: "current-password" },
		});
		fireEvent.change(screen.getByLabelText("New password", { exact: true }), {
			target: { value: "next-password" },
		});
		fireEvent.change(screen.getByLabelText("Confirm new password"), {
			target: { value: "next-password" },
		});
		fireEvent.click(screen.getByRole("button", { name: "Update password" }));
		await waitFor(() =>
			expect(toast.error).toHaveBeenCalledWith(
				"Couldn't update your password. Check your connection and try again.",
			),
		);
		expect((screen.getByLabelText("Current password") as HTMLInputElement).value).toBe(
			"current-password",
		);
		expect((screen.getByLabelText("New password", { exact: true }) as HTMLInputElement).value).toBe(
			"next-password",
		);
		expect((screen.getByLabelText("Confirm new password") as HTMLInputElement).value).toBe(
			"next-password",
		);
		fireEvent.click(screen.getByRole("button", { name: "Update password" }));
		await waitFor(() => expect(auth.changePassword).toHaveBeenCalledTimes(2));
		expect(auth.changePassword.mock.calls[1]?.[0]).toEqual({
			currentPassword: "current-password",
			newPassword: "next-password",
			revokeOtherSessions: true,
		});
		expect(toast.success).not.toHaveBeenCalled();
	});

	it("reports rejected verification transport without losing the code, setup key or backup codes", async () => {
		auth.enable.mockResolvedValue({
			data: {
				totpURI: "otpauth://totp/LinkDen:admin?secret=TESTSECRET&issuer=LinkDen",
				backupCodes: ["backup-one", "backup-two"],
			},
			error: null,
		});
		auth.verifyTotp.mockRejectedValue(new Error("PRIVATE_TRANSPORT_PAYLOAD"));
		renderTab();
		const toggle = await screen.findByRole("switch", { name: "Two-factor authentication" });
		fireEvent.click(toggle);
		fireEvent.change(screen.getByLabelText("Current password"), {
			target: { value: "current-password" },
		});
		fireEvent.click(screen.getByRole("button", { name: "Continue" }));
		await screen.findByText("Scan with your authenticator app");
		toast.success.mockClear();
		fireEvent.change(screen.getByLabelText("Verification code"), { target: { value: "123456" } });
		fireEvent.click(screen.getByRole("button", { name: "Verify & activate" }));
		await waitFor(() =>
			expect(toast.error).toHaveBeenCalledWith(
				"Couldn't verify the code. Check your connection and try again.",
			),
		);
		expect((screen.getByLabelText("Verification code") as HTMLInputElement).value).toBe("123456");
		expect(screen.getByText("TESTSECRET")).toBeTruthy();
		expect(screen.getByText("backup-one")).toBeTruthy();
		expect(screen.getByText("backup-two")).toBeTruthy();
		expect(screen.getByRole("dialog")).toBeTruthy();
		expect(toggle.getAttribute("aria-checked")).toBe("false");
		fireEvent.click(screen.getByRole("button", { name: "Verify & activate" }));
		await waitFor(() => expect(auth.verifyTotp).toHaveBeenCalledTimes(2));
		expect(auth.verifyTotp.mock.calls[1]?.[0]).toEqual({ code: "123456" });
		expect(auth.enable).toHaveBeenCalledTimes(1);
		expect(toast.success).not.toHaveBeenCalled();
	});

	it("reports rejected disable transport and keeps two-factor enabled with the entered password", async () => {
		auth.user.twoFactorEnabled = true;
		auth.disable.mockRejectedValue(new Error("PRIVATE_TRANSPORT_PAYLOAD"));
		renderTab();
		const toggle = await screen.findByRole("switch", { name: "Two-factor authentication" });
		await waitFor(() => expect(toggle.getAttribute("aria-checked")).toBe("true"));
		fireEvent.click(toggle);
		fireEvent.change(screen.getByLabelText("Current password"), {
			target: { value: "current-password" },
		});
		fireEvent.click(screen.getByRole("button", { name: "Disable" }));
		await waitFor(() =>
			expect(toast.error).toHaveBeenCalledWith(
				"Couldn't disable two-factor authentication. Check your connection and try again.",
			),
		);
		expect((screen.getByLabelText("Current password") as HTMLInputElement).value).toBe(
			"current-password",
		);
		expect(screen.getByRole("dialog")).toBeTruthy();
		expect(toggle.getAttribute("aria-checked")).toBe("true");
		fireEvent.click(screen.getByRole("button", { name: "Disable" }));
		await waitFor(() => expect(auth.disable).toHaveBeenCalledTimes(2));
		expect(auth.disable.mock.calls[1]?.[0]).toEqual({ password: "current-password" });
		expect(toast.success).not.toHaveBeenCalled();
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

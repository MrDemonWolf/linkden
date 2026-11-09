import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const auth = vi.hoisted(() => ({
	signInEmail: vi.fn(),
	verifyTotp: vi.fn(),
	verifyBackupCode: vi.fn(),
	branding: null as Record<string, string> | null,
}));

vi.mock("@/lib/auth-client", () => ({
	authClient: {
		signIn: { email: auth.signInEmail, magicLink: vi.fn() },
		twoFactor: { verifyTotp: auth.verifyTotp, verifyBackupCode: auth.verifyBackupCode },
		requestPasswordReset: vi.fn(),
		$fetch: vi.fn(),
	},
}));

vi.mock("@/utils/trpc", () => ({
	trpc: {
		public: {
			getSetupStatus: {
				queryOptions: () => ({
					queryKey: ["getSetupStatus"],
					queryFn: async () => ({
						completed: true,
						magicLinkEnabled: false,
						branding: auth.branding,
					}),
				}),
			},
			hasUsers: {
				queryOptions: () => ({ queryKey: ["hasUsers"], queryFn: async () => ({ hasUsers: true }) }),
			},
		},
	},
}));

vi.mock("next/navigation", () => ({ useRouter: () => ({ replace: vi.fn(), push: vi.fn() }) }));

import AdminLoginPage from "../page";

function renderLogin() {
	const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
	return render(
		<QueryClientProvider client={qc}>
			<AdminLoginPage />
		</QueryClientProvider>,
	);
}

async function submitPassword() {
	fireEvent.change(screen.getByLabelText("Email"), { target: { value: "me@example.com" } });
	fireEvent.change(screen.getByLabelText("Password"), { target: { value: "correct horse" } });
	await act(async () => {
		fireEvent.click(screen.getByRole("button", { name: /sign in$/i }));
	});
}

describe("login with two-factor authentication", () => {
	// Vitest runs without globals, so RTL can't register its own cleanup.
	afterEach(() => {
		cleanup();
		vi.unstubAllEnvs();
	});

	beforeEach(() => {
		vi.clearAllMocks();
		auth.branding = null;
		auth.signInEmail.mockResolvedValue({
			data: { twoFactorRedirect: true, twoFactorMethods: ["totp"] },
			error: null,
		});
	});

	it("hides dev login in production even when its public flag is set", async () => {
		vi.stubEnv("NODE_ENV", "production");
		vi.stubEnv("NEXT_PUBLIC_DEV_LOGIN", "true");
		renderLogin();
		await screen.findByText("Sign in to LinkDen");
		expect(screen.queryByRole("button", { name: /dev login/i })).toBeNull();
	});

	it("shows dev login on an explicitly enabled local development page", async () => {
		vi.stubEnv("NODE_ENV", "development");
		vi.stubEnv("NEXT_PUBLIC_DEV_LOGIN", "true");
		renderLogin();
		expect(await screen.findByRole("button", { name: "Dev login (bypass)" })).toBeTruthy();
	});

	it("uses shared site branding and ignores retained login-specific overrides", async () => {
		auth.branding = {
			siteName: "My LinkDen",
			logoUrl: "https://example.com/site-logo.png",
			loginLogoUrl: "https://example.com/legacy-logo.png",
			loginBgMode: "custom",
			loginBgCustomUrl: "https://example.com/legacy-background.png",
		};
		const { container } = renderLogin();
		expect(await screen.findByText("Sign in to My LinkDen")).toBeTruthy();
		expect(container.querySelector('img[src="https://example.com/site-logo.png"]')).toBeTruthy();
		expect(container.querySelector('img[src="https://example.com/legacy-logo.png"]')).toBeNull();
		expect(container.querySelector('[style*="legacy-background"]')).toBeNull();
		expect(container.querySelector("aside")).toBeNull();
	});

	it("asks for the TOTP code instead of navigating without a session", async () => {
		auth.verifyTotp.mockResolvedValue({ data: { token: "t" }, error: null });
		renderLogin();
		await submitPassword();

		const code = await screen.findByLabelText("Authentication code");
		expect(screen.queryByText("Welcome back")).toBeNull();

		fireEvent.change(code, { target: { value: "123 456" } });
		fireEvent.click(screen.getByText("Don't ask again on this device for 30 days"));
		await act(async () => {
			fireEvent.click(screen.getByRole("button", { name: /verify/i }));
		});

		expect(auth.verifyTotp).toHaveBeenCalledWith({ code: "123456", trustDevice: true });
		await waitFor(() => expect(screen.getByText("Signing you in...")).toBeTruthy());
	});

	it("accepts a backup code and stays on the step when a code is wrong", async () => {
		auth.verifyBackupCode
			.mockResolvedValueOnce({ data: null, error: { message: "Invalid backup code" } })
			.mockResolvedValueOnce({ data: { token: "t" }, error: null });
		renderLogin();
		await submitPassword();

		const backupAction = await screen.findByRole("button", { name: /use a backup code/i });
		expect(backupAction.getAttribute("type")).toBe("button");
		fireEvent.click(backupAction);
		const code = screen.getByLabelText("Backup code");
		fireEvent.change(code, { target: { value: " abcde-fghij " } });
		await act(async () => {
			fireEvent.click(screen.getByRole("button", { name: /verify/i }));
		});
		expect(auth.verifyBackupCode).toHaveBeenLastCalledWith({
			code: "abcde-fghij",
			trustDevice: false,
		});
		expect(screen.getByText("Invalid backup code")).toBeTruthy();
		expect(screen.getByLabelText("Backup code")).toBeTruthy();

		await act(async () => {
			fireEvent.click(screen.getByRole("button", { name: /verify/i }));
		});
		await waitFor(() => expect(screen.getByText("Signing you in...")).toBeTruthy());
	});

	it("returns to the password step when the pending sign-in has expired", async () => {
		auth.verifyTotp.mockResolvedValue({
			data: null,
			error: { code: "INVALID_TWO_FACTOR_COOKIE", message: "Invalid two factor cookie" },
		});
		renderLogin();
		await submitPassword();

		fireEvent.change(await screen.findByLabelText("Authentication code"), {
			target: { value: "123456" },
		});
		await act(async () => {
			fireEvent.click(screen.getByRole("button", { name: /verify/i }));
		});
		expect(screen.getByText("That sign-in attempt expired. Sign in again.")).toBeTruthy();
		expect(screen.getByLabelText("Password")).toBeTruthy();
	});
});

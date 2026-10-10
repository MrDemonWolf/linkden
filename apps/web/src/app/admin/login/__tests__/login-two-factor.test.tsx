import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const auth = vi.hoisted(() => ({
	signInEmail: vi.fn(),
	verifyTotp: vi.fn(),
	verifyBackupCode: vi.fn(),
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
					queryFn: async () => ({ completed: true, magicLinkEnabled: false, branding: null }),
				}),
			},
			hasUsers: {
				queryOptions: () => ({ queryKey: ["hasUsers"], queryFn: async () => ({ hasUsers: true }) }),
			},
		},
	},
}));

vi.mock("next/navigation", () => ({ useRouter: () => ({ replace: vi.fn(), push: vi.fn() }) }));
vi.mock("@/components/public/shader-banner", () => ({ ShaderBanner: () => null }));

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
	afterEach(cleanup);

	beforeEach(() => {
		vi.clearAllMocks();
		auth.signInEmail.mockResolvedValue({
			data: { twoFactorRedirect: true, twoFactorMethods: ["totp"] },
			error: null,
		});
	});

	it("asks for the TOTP code instead of navigating without a session", async () => {
		auth.verifyTotp.mockResolvedValue({ data: { token: "t" }, error: null });
		renderLogin();
		await submitPassword();

		const code = await screen.findByLabelText("Authentication code");
		expect(screen.queryByText("Welcome back")).toBeNull();

		fireEvent.change(code, { target: { value: "123 456" } });
		await act(async () => {
			fireEvent.click(screen.getByRole("button", { name: /verify/i }));
		});

		expect(auth.verifyTotp).toHaveBeenCalledWith({ code: "123456", trustDevice: false });
		await waitFor(() => expect(screen.getByText("Signing you in...")).toBeTruthy());
	});

	it("accepts a backup code and stays on the step when a code is wrong", async () => {
		auth.verifyBackupCode
			.mockResolvedValueOnce({ data: null, error: { message: "Invalid backup code" } })
			.mockResolvedValueOnce({ data: { token: "t" }, error: null });
		renderLogin();
		await submitPassword();

		fireEvent.click(await screen.findByRole("button", { name: /use a backup code/i }));
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

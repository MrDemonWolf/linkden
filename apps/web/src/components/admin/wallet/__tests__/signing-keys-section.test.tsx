import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const api = vi.hoisted(() => ({
	getSigningKeys: vi.fn(),
	getSigningStatus: vi.fn(),
	updateSigningKeys: vi.fn(),
}));
const toast = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }));

vi.mock("@/utils/trpc", () => ({
	trpc: {
		wallet: {
			getSigningKeys: {
				queryOptions: () => ({ queryKey: ["getSigningKeys"], queryFn: api.getSigningKeys }),
			},
			getSigningStatus: {
				queryOptions: () => ({ queryKey: ["getSigningStatus"], queryFn: api.getSigningStatus }),
			},
			updateSigningKeys: { mutationOptions: () => ({ mutationFn: api.updateSigningKeys }) },
		},
	},
}));
vi.mock("sonner", () => ({ toast }));

import { SigningKeysSection } from "../signing-keys-section";

const CERT_PEM =
	"-----BEGIN CERTIFICATE-----\nMIIBszCCAVmgAwIBAgIUQ2VydGlmaWNhdGVGaXh0dXJl\n-----END CERTIFICATE-----";

const savedKeys = {
	hasSignerCert: false,
	hasSignerKey: true,
	hasWwdrCert: false,
	teamId: "ABC123DEF4",
	passTypeId: "pass.com.example",
};

function renderSection() {
	const client = new QueryClient({
		defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
	});
	return render(
		<QueryClientProvider client={client}>
			<SigningKeysSection />
		</QueryClientProvider>,
	);
}

describe("SigningKeysSection", () => {
	beforeEach(() => {
		api.getSigningKeys.mockResolvedValue(savedKeys);
		api.getSigningStatus.mockResolvedValue({ source: {} });
		api.updateSigningKeys.mockResolvedValue({ success: true });
	});
	afterEach(() => {
		cleanup();
		vi.clearAllMocks();
	});

	it("shows a retry state instead of a blank form when the keys fail to load", async () => {
		api.getSigningKeys.mockRejectedValue(new Error("offline"));
		renderSection();
		expect(await screen.findByText("Couldn't load your signing keys")).toBeTruthy();
		expect(screen.queryByLabelText("Team ID")).toBeNull();
	});

	it("saves pasted PEM as raw PEM and leaves the unchanged IDs out", async () => {
		renderSection();
		fireEvent.click(await screen.findByRole("button", { name: "Paste Signer Certificate" }));
		fireEvent.change(screen.getByLabelText("Signer Certificate"), {
			target: { value: CERT_PEM },
		});
		fireEvent.click(screen.getByRole("button", { name: "Apply pasted Signer Certificate" }));
		fireEvent.click(screen.getByRole("button", { name: "Save Signing Keys" }));

		await waitFor(() => expect(api.updateSigningKeys).toHaveBeenCalled());
		expect(api.updateSigningKeys.mock.calls[0]?.[0]).toEqual({
			teamId: undefined,
			passTypeId: undefined,
			signerCert: CERT_PEM,
			signerKey: undefined,
			wwdrCert: undefined,
		});
	});

	it("refuses material the signer can't load, with the reason, and offers no save", async () => {
		renderSection();
		fireEvent.click(await screen.findByRole("button", { name: "Paste Signer Key" }));
		fireEvent.change(screen.getByLabelText("Signer Key"), { target: { value: CERT_PEM } });
		fireEvent.click(screen.getByRole("button", { name: "Apply pasted Signer Key" }));

		expect(screen.getByRole("alert").textContent).toMatch(/RSA private key/);
		expect(screen.queryByRole("button", { name: "Save Signing Keys" })).toBeNull();
	});

	it("clears a saved key with an empty string so the env value applies", async () => {
		renderSection();
		fireEvent.click(await screen.findByRole("button", { name: "Clear saved Signer Key" }));
		fireEvent.click(screen.getByRole("button", { name: "Save Signing Keys" }));
		await waitFor(() => expect(api.updateSigningKeys).toHaveBeenCalled());
		expect(api.updateSigningKeys.mock.calls[0]?.[0]).toMatchObject({ signerKey: "" });
	});

	it("shows the router's reason when the save is refused", async () => {
		api.updateSigningKeys.mockRejectedValue({
			message: "WWDR certificate must be a PEM or DER X.509 certificate",
			data: { httpStatus: 400 },
		});
		renderSection();
		fireEvent.change(await screen.findByLabelText("Team ID"), { target: { value: "NEWTEAM123" } });
		fireEvent.click(screen.getByRole("button", { name: "Save Signing Keys" }));
		await waitFor(() =>
			expect(toast.error).toHaveBeenCalledWith(
				"WWDR certificate must be a PEM or DER X.509 certificate",
			),
		);
		expect(api.updateSigningKeys.mock.calls[0]?.[0]).toMatchObject({
			teamId: "NEWTEAM123",
			passTypeId: undefined,
		});
	});
});

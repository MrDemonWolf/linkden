import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const submitFn = vi.fn();

vi.mock("@/utils/trpc", () => ({
	trpc: {
		public: { submitContact: { mutationOptions: () => ({ mutationFn: submitFn }) } },
	},
}));
vi.mock("@/lib/track", () => ({ trackClick: vi.fn() }));
// The real widget injects the provider's script; this stand-in "solves" on click.
vi.mock("../captcha-widget", async (importOriginal) => {
	const actual = await importOriginal<typeof import("../captcha-widget")>();
	return {
		...actual,
		CaptchaWidget: ({ id, onToken }: { id: string; onToken: (t: string | null) => void }) => (
			<button type="button" id={id} onClick={() => onToken("captcha-token")}>
				solve captcha
			</button>
		),
	};
});

import { ConnectBlock, ConnectForm } from "../connect-block";

function wrap(ui: ReactNode) {
	const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
	return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

function fillRequired() {
	fireEvent.change(screen.getByLabelText("First Name"), { target: { value: "Ada" } });
	fireEvent.change(screen.getByLabelText("Last Name"), { target: { value: "Lovelace" } });
	fireEvent.change(screen.getByLabelText("Email Address"), {
		target: { value: "ada@example.com" },
	});
	fireEvent.click(screen.getByRole("checkbox"));
}

describe("ConnectForm", () => {
	// Block body: a function returned from beforeEach would run as a teardown.
	beforeEach(() => {
		submitFn.mockReset();
		submitFn.mockResolvedValue({ success: true });
	});
	afterEach(cleanup);

	it("sends the hidden honeypot only when something filled it in", async () => {
		const { container } = wrap(
			<ConnectForm blockId="b1" blockTitle={null} config={{}} colorMode="light" />,
		);
		const honeypot = container.querySelector<HTMLInputElement>('input[name="website"]');
		expect(honeypot?.tabIndex).toBe(-1);
		expect(honeypot?.closest("[aria-hidden='true']")).toBeTruthy();

		fillRequired();
		fireEvent.click(screen.getByRole("button", { name: "Connect" }));
		await waitFor(() => expect(submitFn).toHaveBeenCalledOnce());
		expect(submitFn.mock.calls[0]?.[0].website).toBeUndefined();
	});

	it("passes a filled honeypot through so the server can drop the bot", async () => {
		const { container } = wrap(
			<ConnectForm blockId="b1" blockTitle={null} config={{}} colorMode="light" />,
		);
		const honeypot = container.querySelector<HTMLInputElement>('input[name="website"]');
		if (!honeypot) throw new Error("no honeypot");
		fireEvent.change(honeypot, { target: { value: "http://spam.example" } });
		fillRequired();
		fireEvent.click(screen.getByRole("button", { name: "Connect" }));
		await waitFor(() => expect(submitFn).toHaveBeenCalledOnce());
		expect(submitFn.mock.calls[0]?.[0].website).toBe("http://spam.example");
	});

	it("opens a text-mode privacy policy in a dialog from the consent label", async () => {
		wrap(
			<ConnectForm
				blockId="b1"
				blockTitle={null}
				config={{}}
				colorMode="light"
				privacyNotice={{ kind: "text", text: "We keep only what you send." }}
			/>,
		);
		fireEvent.click(screen.getByRole("button", { name: "Privacy Policy" }));
		expect(await screen.findByText("We keep only what you send.")).toBeTruthy();
	});

	it("doesn't ask where we met unless the block opts in", () => {
		wrap(<ConnectForm blockId="b1" blockTitle={null} config={{}} colorMode="light" />);
		expect(screen.queryByLabelText(/where did we meet/i)).toBeNull();
	});

	it("asks where we met for the connect preset", () => {
		wrap(
			<ConnectForm
				blockId="b1"
				blockTitle={null}
				config={{ preset: "connect" }}
				colorMode="light"
			/>,
		);
		expect(screen.getByLabelText(/where did we meet/i)).toBeTruthy();
	});

	it("submits without a where-met value when the block doesn't ask", async () => {
		wrap(<ConnectForm blockId="b1" blockTitle="Hi" config={{}} colorMode="light" />);
		fillRequired();
		fireEvent.click(screen.getByRole("button", { name: "Connect" }));
		await waitFor(() => expect(submitFn).toHaveBeenCalledOnce());
		expect(submitFn.mock.calls[0]?.[0]).toMatchObject({
			firstName: "Ada",
			email: "ada@example.com",
			blockId: "b1",
			consent: true,
			captchaToken: undefined,
		});
	});

	it("holds the submit until the CAPTCHA is solved, then sends its token", async () => {
		wrap(
			<ConnectForm
				blockId="b1"
				blockTitle={null}
				config={{}}
				colorMode="light"
				captchaProvider="turnstile"
				captchaSiteKey="site-key"
			/>,
		);
		fillRequired();
		fireEvent.click(screen.getByRole("button", { name: "Connect" }));
		expect(await screen.findByText(/complete the spam check/i)).toBeTruthy();
		expect(submitFn).not.toHaveBeenCalled();

		fireEvent.click(screen.getByRole("button", { name: "solve captcha" }));
		fireEvent.click(screen.getByRole("button", { name: "Connect" }));
		await waitFor(() => expect(submitFn).toHaveBeenCalledOnce());
		expect(submitFn.mock.calls[0]?.[0]).toMatchObject({ captchaToken: "captcha-token" });
	});

	it("says the form is unavailable when CAPTCHA is on but no site key is public", () => {
		wrap(
			<ConnectForm
				blockId="b1"
				blockTitle={null}
				config={{}}
				colorMode="light"
				captchaProvider="hcaptcha"
				captchaSiteKey={null}
			/>,
		);
		expect(screen.getByRole("alert").textContent).toMatch(/can't accept messages/i);
	});

	it("shows why the server refused instead of a generic retry", async () => {
		submitFn.mockImplementation(async () => {
			throw Object.assign(new Error("CAPTCHA verification failed"), {
				data: { code: "BAD_REQUEST" },
			});
		});
		wrap(<ConnectForm blockId="b1" blockTitle={null} config={{}} colorMode="light" />);
		fillRequired();
		fireEvent.click(screen.getByRole("button", { name: "Connect" }));
		expect(await screen.findByText(/spam check didn't go through/i)).toBeTruthy();
	});

	it("announces the in-flight state and keeps the button focusable", async () => {
		let resolve: (v: unknown) => void = () => {};
		submitFn.mockReturnValue(new Promise((r) => (resolve = r)));
		wrap(<ConnectForm blockId="b1" blockTitle={null} config={{}} colorMode="light" />);
		fillRequired();
		const button = screen.getByRole("button", { name: "Connect" });
		fireEvent.click(button);
		await screen.findByText("Sending your message…");
		expect(button.getAttribute("aria-disabled")).toBe("true");
		expect(button.hasAttribute("disabled")).toBe(false);
		await act(async () => resolve({ success: true }));
	});
});

describe("ConnectBlock modal", () => {
	afterEach(cleanup);

	it("returns focus to the trigger when the dialog closes", async () => {
		wrap(
			<ConnectBlock
				block={{ id: "b1", title: "Say hi" }}
				config={{ displayMode: "modal", buttonText: "Connect With Me" }}
				colorMode="light"
			/>,
		);
		const trigger = screen.getByRole("button", { name: "Connect With Me" });
		trigger.focus();
		fireEvent.click(trigger);
		const dialog = await screen.findByRole("dialog");
		// Rendered outside `.ld-page` (portaled to <body>).
		expect(dialog.closest(".ld-connect-block")).toBeNull();

		fireEvent.click(screen.getByRole("button", { name: "Close" }));
		await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
		await waitFor(() => expect(document.activeElement).toBe(trigger));
	});
});

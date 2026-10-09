import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SidebarMenuButton, SidebarProvider, useSidebar } from "../sidebar";

function Probe() {
	const { state, openMobile } = useSidebar();
	return (
		<>
			<p data-testid="state">{state}</p>
			<p data-testid="mobile">{String(openMobile)}</p>
			<input aria-label="Bio" />
		</>
	);
}

function setWidth(width: number) {
	vi.stubGlobal("innerWidth", width);
	vi.stubGlobal("matchMedia", (query: string) => ({
		matches: false,
		media: query,
		addEventListener: () => {},
		removeEventListener: () => {},
	}));
}

function clearCookie() {
	// biome-ignore lint/suspicious/noDocumentCookie: test fixture reset
	document.cookie = "sidebar_state=; path=/; max-age=0";
}

describe("SidebarProvider", () => {
	beforeEach(() => {
		setWidth(1280);
		clearCookie();
	});
	afterEach(() => {
		cleanup();
		vi.unstubAllGlobals();
		clearCookie();
	});

	it("restores the persisted collapsed state on mount", () => {
		// biome-ignore lint/suspicious/noDocumentCookie: seeding the persisted state
		document.cookie = "sidebar_state=false; path=/";
		render(
			<SidebarProvider>
				<Probe />
			</SidebarProvider>,
		);
		expect(screen.getByTestId("state").textContent).toBe("collapsed");
	});

	it("starts from defaultOpen when nothing was saved", () => {
		render(
			<SidebarProvider>
				<Probe />
			</SidebarProvider>,
		);
		expect(screen.getByTestId("state").textContent).toBe("expanded");
	});

	it("toggles on Ctrl+B outside text fields and persists the result", () => {
		render(
			<SidebarProvider>
				<Probe />
			</SidebarProvider>,
		);
		act(() => {
			fireEvent.keyDown(document.body, { key: "b", ctrlKey: true });
		});
		expect(screen.getByTestId("state").textContent).toBe("collapsed");
		expect(document.cookie).toContain("sidebar_state=false");
	});

	it("leaves Ctrl+B to the text field when typing", () => {
		render(
			<SidebarProvider>
				<Probe />
			</SidebarProvider>,
		);
		const input = screen.getByLabelText("Bio");
		const event = new KeyboardEvent("keydown", { key: "b", ctrlKey: true, bubbles: true });
		act(() => {
			input.dispatchEvent(event);
		});
		expect(event.defaultPrevented).toBe(false);
		expect(screen.getByTestId("state").textContent).toBe("expanded");
	});

	it("never opens the mobile drawer from the shortcut", () => {
		setWidth(500);
		render(
			<SidebarProvider>
				<Probe />
			</SidebarProvider>,
		);
		act(() => {
			fireEvent.keyDown(document.body, { key: "b", ctrlKey: true });
		});
		expect(screen.getByTestId("mobile").textContent).toBe("false");
	});
});

describe("SidebarMenuButton", () => {
	beforeEach(() => setWidth(1280));
	afterEach(() => {
		cleanup();
		vi.unstubAllGlobals();
	});

	it("marks the active destination with aria-current", () => {
		render(
			<SidebarProvider>
				<SidebarMenuButton isActive>Links</SidebarMenuButton>
				<SidebarMenuButton>Design</SidebarMenuButton>
			</SidebarProvider>,
		);
		expect(screen.getByRole("button", { name: "Links" }).getAttribute("aria-current")).toBe("page");
		expect(screen.getByRole("button", { name: "Design" }).hasAttribute("aria-current")).toBe(false);
	});
});

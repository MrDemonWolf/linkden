import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PreviewColumn } from "./preview-column";
import { type PreviewRegistration, PreviewSlotState } from "./preview-slot";

vi.mock("./page-preview", () => ({ PagePreview: () => <p>phone</p> }));
vi.mock("@/components/ui/tooltip", () => ({
	TooltipHint: ({ children }: { children: React.ReactNode }) => children,
}));

/** Stands in for BlockEditPanel: local, unsaved field state. */
function Editor({ label }: { label: string }) {
	const [title, setTitle] = useState("");
	return <input aria-label={label} value={title} onChange={(e) => setTitle(e.target.value)} />;
}

const withPanel = (id: string): PreviewRegistration => ({
	panel: <Editor key={id} label={`Title ${id}`} />,
});

describe("PreviewColumn (lg–xl slot)", () => {
	beforeEach(() => {
		// lg but not xl: the column shows the editor OR the phone.
		vi.stubGlobal("matchMedia", (query: string) => ({
			matches: query === "(min-width: 1024px)",
			addEventListener: () => {},
			removeEventListener: () => {},
		}));
	});
	afterEach(() => {
		cleanup();
		vi.unstubAllGlobals();
	});

	it("keeps the editor's unsaved fields across Show preview / Back to editor", () => {
		render(
			<PreviewSlotState value={withPanel("a")}>
				<PreviewColumn />
			</PreviewSlotState>,
		);
		fireEvent.change(screen.getByLabelText("Title a"), { target: { value: "Draft title" } });

		act(() => fireEvent.click(screen.getByRole("button", { name: /show preview/i })));
		expect(screen.getByText("phone")).toBeTruthy();
		act(() => fireEvent.click(screen.getByRole("button", { name: /back to editor/i })));

		expect((screen.getByLabelText("Title a") as HTMLInputElement).value).toBe("Draft title");
	});

	it("opens the next edited block in the editor, not the phone", () => {
		const { rerender } = render(
			<PreviewSlotState value={withPanel("a")}>
				<PreviewColumn />
			</PreviewSlotState>,
		);
		act(() => fireEvent.click(screen.getByRole("button", { name: /show preview/i })));

		rerender(
			<PreviewSlotState value={withPanel("b")}>
				<PreviewColumn />
			</PreviewSlotState>,
		);
		expect(screen.getByRole("button", { name: /show preview/i })).toBeTruthy();
		expect(screen.queryByText("phone")).toBeNull();
	});

	it("reopens the same block in the editor after the editor was closed mid-peek", () => {
		const { rerender } = render(
			<PreviewSlotState value={withPanel("a")}>
				<PreviewColumn />
			</PreviewSlotState>,
		);
		act(() => fireEvent.click(screen.getByRole("button", { name: /show preview/i })));

		// Editor closed (no panel), then the same block opened again.
		rerender(
			<PreviewSlotState value={{}}>
				<PreviewColumn />
			</PreviewSlotState>,
		);
		rerender(
			<PreviewSlotState value={withPanel("a")}>
				<PreviewColumn />
			</PreviewSlotState>,
		);
		expect(screen.getByRole("button", { name: /show preview/i })).toBeTruthy();
		expect(screen.queryByText("phone")).toBeNull();
	});
});

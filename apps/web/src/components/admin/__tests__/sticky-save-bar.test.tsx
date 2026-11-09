import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { StickySaveBar } from "../sticky-save-bar";

afterEach(cleanup);

it("prevents discarding while the pending save can still change the baseline", () => {
	const onDiscard = vi.fn();
	const props = { isDirty: true, isSaving: true, onSave: vi.fn(), onDiscard };
	const { rerender } = render(<StickySaveBar {...props} />);
	fireEvent.click(screen.getByRole("button", { name: "Discard" }));
	expect(onDiscard).not.toHaveBeenCalled();
	rerender(<StickySaveBar {...props} isSaving={false} />);
	fireEvent.click(screen.getByRole("button", { name: "Discard" }));
	expect(onDiscard).toHaveBeenCalledOnce();
});

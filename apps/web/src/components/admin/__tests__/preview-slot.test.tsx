import { act, render, screen } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it } from "vitest";
import {
	type PreviewRegistration,
	PreviewSlotSetter,
	PreviewSlotState,
	usePreviewRegistration,
	usePreviewSlot,
} from "../preview-slot";

function Page({ label }: { label: string }) {
	usePreviewSlot({ altView: { label, node: null } });
	return <p>page</p>;
}

function Column() {
	const reg = usePreviewRegistration();
	return <output>{reg ? (reg.altView?.label ?? "registered") : "none"}</output>;
}

function Shell({ children }: { children: React.ReactNode }) {
	const [reg, setReg] = useState<PreviewRegistration | null>(null);
	return (
		<PreviewSlotSetter value={setReg}>
			<PreviewSlotState value={reg}>
				{children}
				<Column />
			</PreviewSlotState>
		</PreviewSlotSetter>
	);
}

describe("preview slot", () => {
	it("registers on mount, follows re-renders, and clears on unmount", () => {
		const { rerender } = render(
			<Shell>
				<Page label="OG card" />
			</Shell>,
		);
		expect(screen.getByRole("status").textContent).toBe("OG card");

		rerender(
			<Shell>
				<Page label="Phone" />
			</Shell>,
		);
		expect(screen.getByRole("status").textContent).toBe("Phone");

		rerender(<Shell>{null}</Shell>);
		act(() => {});
		expect(screen.getByRole("status").textContent).toBe("none");
	});
});

import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useState } from "react";
import { afterEach, describe, expect, it } from "vitest";
import { ColorPalettePanel } from "../color-palette-panel";

function Palette() {
	const [colors, setColors] = useState({ bg: "#091533", fg: "#FFFFFF", label: "#0FACED" });
	return (
		<ColorPalettePanel
			{...colors}
			onPick={setColors}
			onFgChange={(fg) => setColors({ ...colors, fg })}
			onLabelChange={(label) => setColors({ ...colors, label })}
		/>
	);
}

describe("Wallet color palettes", () => {
	afterEach(cleanup);

	it("uses one tab stop and arrow keys to change the selected palette", async () => {
		render(<Palette />);
		const navy = screen.getByRole("radio", { name: "Navy" });
		const indigo = screen.getByRole("radio", { name: "Indigo" });
		expect(navy.getAttribute("aria-checked")).toBe("true");
		expect(navy.tabIndex).toBe(0);
		expect(indigo.tabIndex).toBe(-1);
		act(() => navy.focus());
		fireEvent.keyDown(navy, { key: "ArrowRight" });
		await waitFor(() => expect(indigo.getAttribute("aria-checked")).toBe("true"));
		expect(document.activeElement).toBe(indigo);
		expect(indigo.getAttribute("aria-checked")).toBe("true");
		expect(navy.getAttribute("aria-checked")).toBe("false");
		expect(navy.tabIndex).toBe(-1);
		expect(indigo.tabIndex).toBe(0);
	});
});

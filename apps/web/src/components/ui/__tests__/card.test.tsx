import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { CardTitle } from "../card";

afterEach(cleanup);

describe("card headings", () => {
	it("exposes a native section heading without an extra wrapper", () => {
		render(<CardTitle>Branding</CardTitle>);
		expect(screen.getByRole("heading", { level: 2, name: "Branding" }).tagName).toBe("H2");
	});

	it("supports a native subsection heading beneath a section", () => {
		render(
			<section>
				<CardTitle>Historical reports</CardTitle>
				<CardTitle as="h3">Countries</CardTitle>
			</section>,
		);
		expect(screen.getByRole("heading", { level: 3, name: "Countries" }).tagName).toBe("H3");
		expect(document.querySelector("h2 h3, h3 h2")).toBeNull();
	});
});

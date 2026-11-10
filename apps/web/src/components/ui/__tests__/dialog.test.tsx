import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { Dialog, DialogContent, DialogTitle } from "../dialog";

afterEach(cleanup);

function popupClasses(className?: string) {
	render(
		<Dialog open>
			<DialogContent className={className}>
				<DialogTitle>Adjust image</DialogTitle>
			</DialogContent>
		</Dialog>,
	);
	return screen.getByRole("dialog").className.split(/\s+/);
}

describe("DialogContent width", () => {
	it("defaults to a phone gutter and max-w-sm from sm up", () => {
		const classes = popupClasses();
		expect(classes).toContain("max-w-[calc(100%-2rem)]");
		expect(classes).toContain("sm:max-w-sm");
	});

	it("lets a caller widen the dialog with sm:max-w-* while keeping the phone gutter", () => {
		const classes = popupClasses("sm:max-w-3xl");
		expect(classes).toContain("sm:max-w-3xl");
		expect(classes).not.toContain("sm:max-w-sm");
		expect(classes).toContain("max-w-[calc(100%-2rem)]");
	});

	it("does not treat a bare max-w-* as a desktop width (the sm default still wins there)", () => {
		const classes = popupClasses("max-w-3xl");
		expect(classes).toContain("sm:max-w-sm");
		expect(classes).not.toContain("max-w-[calc(100%-2rem)]");
	});
});

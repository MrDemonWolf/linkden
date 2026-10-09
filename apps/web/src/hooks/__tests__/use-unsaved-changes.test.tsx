import { cleanup, fireEvent, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useUnsavedChanges } from "../use-unsaved-changes";

function Form({ dirty }: { dirty: boolean }) {
	useUnsavedChanges(dirty);
	return null;
}

function Page({ a, b }: { a: boolean; b: boolean }) {
	return (
		<>
			<Form dirty={a} />
			<Form dirty={b} />
			<a href="/admin/design">Design</a>
		</>
	);
}

/** Click the in-app link; returns whether navigation went ahead. */
function clickLink(link: HTMLElement) {
	return fireEvent.click(link);
}

describe("useUnsavedChanges", () => {
	let confirm: ReturnType<typeof vi.fn>;
	// jsdom can't navigate; stop the anchor's default action after the guard ran.
	const swallow = (e: Event) => e.preventDefault();

	beforeEach(() => {
		confirm = vi.fn(() => false);
		vi.stubGlobal("confirm", confirm);
		document.addEventListener("click", swallow);
	});
	afterEach(() => {
		cleanup();
		document.removeEventListener("click", swallow);
		vi.unstubAllGlobals();
		delete (window as { navigation?: EventTarget }).navigation;
	});

	it("asks once however many forms are dirty, and blocks on cancel", () => {
		const { getByText, rerender } = render(<Page a b />);
		const cancelled = !clickLink(getByText("Design"));
		expect(confirm).toHaveBeenCalledTimes(1);
		expect(cancelled).toBe(true);

		// All clean again: the guard is gone.
		rerender(<Page a={false} b={false} />);
		confirm.mockClear();
		clickLink(getByText("Design"));
		expect(confirm).not.toHaveBeenCalled();
	});

	it("confirms browser Back/Forward through the Navigation API", () => {
		const navigation = new EventTarget();
		(window as { navigation?: EventTarget }).navigation = navigation;
		const navigate = (navigationType: string) => {
			const e = Object.assign(new Event("navigate", { cancelable: true }), { navigationType });
			navigation.dispatchEvent(e);
			return e;
		};

		const { rerender } = render(<Page a b={false} />);
		expect(navigate("traverse").defaultPrevented).toBe(true);
		expect(confirm).toHaveBeenCalledTimes(1);
		// Pushes come from link clicks, which the click guard already asked about.
		expect(navigate("push").defaultPrevented).toBe(false);

		confirm.mockReturnValue(true);
		expect(navigate("traverse").defaultPrevented).toBe(false);

		rerender(<Page a={false} b={false} />);
		confirm.mockClear();
		navigate("traverse");
		expect(confirm).not.toHaveBeenCalled();
	});
});

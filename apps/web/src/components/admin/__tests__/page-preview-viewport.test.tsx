import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PagePreviewViewport } from "../page-preview-viewport";

let observer: ResizeObserverCallback;
beforeEach(() => {
	vi.stubGlobal(
		"ResizeObserver",
		class {
			constructor(callback: ResizeObserverCallback) {
				observer = callback;
			}
			observe() {}
			disconnect() {}
		},
	);
});
afterEach(() => {
	cleanup();
	vi.unstubAllGlobals();
});

describe("plain page viewport geometry", () => {
	it("fits a 390px page to narrow screens and recomputes the scroll height after resizing", () => {
		render(
			<PagePreviewViewport>
				<p>Public content</p>
			</PagePreviewViewport>,
		);
		const viewport = screen.getByRole("img", { name: "Live preview of your page" });
		const content = screen.getByText("Public content").parentElement;
		if (!content) throw new Error("Missing virtual viewport");
		const entry = (target: Element, width: number, height: number): ResizeObserverEntry => ({
			target,
			contentRect: new DOMRectReadOnly(0, 0, width, height),
			borderBoxSize: [],
			contentBoxSize: [],
			devicePixelContentBoxSize: [],
		});
		const resize = (width: number, height = 1200) => {
			act(() => {
				observer([entry(viewport, width, 570), entry(content, 390, height)], {
					observe() {},
					unobserve() {},
					disconnect() {},
				});
			});
		};
		resize(254);
		expect(content.style.width).toBe("390px");
		expect(content.style.transform).toBe(`scale(${254 / 390})`);
		expect(Number.parseFloat(viewport.style.height)).toBeCloseTo((1200 * 254) / 390);
		resize(308);
		expect(content.style.transform).toBe(`scale(${308 / 390})`);
		expect(Number.parseFloat(viewport.style.height)).toBeCloseTo((1200 * 308) / 390);
		expect(content.hasAttribute("inert")).toBe(true);

		const scroller = viewport.closest(".overflow-y-auto");
		if (!scroller) throw new Error("Missing scroll screen");
		expect((scroller as HTMLElement).style.maxHeight).toBe("570px");
		fireEvent.scroll(scroller, { target: { scrollTop: 200 } });
		expect(scroller.querySelector('[style*="translateY"]')).toBeNull();

		// Short content must not retain a forced phone-height blank area.
		resize(308, 200);
		expect(Number.parseFloat(viewport.style.height)).toBeCloseTo((200 * 308) / 390);
		expect(content.style.minHeight).toBe("");
	});

	it("announces loading and reveals the same inert public viewport when ready", () => {
		const { rerender } = render(
			<PagePreviewViewport isLoading>
				<p>Public content</p>
			</PagePreviewViewport>,
		);
		expect(screen.getByRole("status").textContent).toBe("Loading preview…");
		expect(screen.queryByRole("img", { name: "Live preview of your page" })).toBeNull();
		const hiddenViewport = screen.getByText("Public content").parentElement?.parentElement;
		expect(hiddenViewport?.style.height).toBe("0px");
		expect(hiddenViewport?.closest('[aria-busy="true"]')).not.toBeNull();
		rerender(
			<PagePreviewViewport>
				<p>Public content</p>
			</PagePreviewViewport>,
		);
		expect(screen.queryByRole("status")).toBeNull();
		expect(screen.getByRole("img", { name: "Live preview of your page" })).toBe(hiddenViewport);
		expect(screen.getByText("Public content").parentElement?.hasAttribute("inert")).toBe(true);
	});
});

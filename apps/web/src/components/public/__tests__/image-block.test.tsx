import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/track", () => ({ trackClick: vi.fn() }));

import { ImageBlock } from "../image-block";
import type { ThemeColors } from "../public-page";

const themeColors = { border: "#ddd", primary: "#2563eb", mutedFg: "#666" } as ThemeColors;
const block = (url: string | null) => ({ id: "b1", title: null, url });

describe("ImageBlock link name (WCAG 2.4.4)", () => {
	afterEach(cleanup);

	it("names an image-only link from its alt text", () => {
		render(
			<ImageBlock
				block={block("https://shop.test/x")}
				config={{ src: "/api/images/block_image/a.png", alt: "My shop" }}
				colorMode="light"
				themeColors={themeColors}
			/>,
		);
		expect(screen.getByRole("link", { name: "My shop" })).toBeTruthy();
	});

	it("falls back to the caption, then the destination host, without alt text", () => {
		const { rerender } = render(
			<ImageBlock
				block={block("https://shop.test/x")}
				config={{ src: "/api/images/block_image/a.png", caption: "New drop" }}
				colorMode="light"
				themeColors={themeColors}
			/>,
		);
		expect(screen.getByRole("link", { name: "New drop" })).toBeTruthy();
		rerender(
			<ImageBlock
				block={block("https://shop.test/x")}
				config={{ src: "/api/images/block_image/a.png" }}
				colorMode="light"
				themeColors={themeColors}
			/>,
		);
		expect(screen.getByRole("link", { name: "Open shop.test" })).toBeTruthy();
	});
});

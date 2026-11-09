import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { getThemeColors } from "@/lib/theme-colors";
import { ImageBlock } from "../image-block";
import { PreviewProvider } from "../preview-context";

const block = { id: "image-1", title: "Wolf logo", url: null };
const themeColors = getThemeColors("default", "light");
const src = "https://example.com/logo.svg";

function picture(config: Record<string, unknown>) {
	return (
		<ImageBlock
			block={block}
			config={{ src, ...config }}
			colorMode="light"
			themeColors={themeColors}
		/>
	);
}

afterEach(cleanup);

describe("ImageBlock", () => {
	it.each(["16:9", "1:1", "4:5"])(
		"fits the whole image inside a responsive %s frame by default",
		(aspect) => {
			render(picture({ aspect }));
			const image = screen.getByRole("img", { name: "Wolf logo" });
			expect(getComputedStyle(image).objectFit).toBe("contain");
			expect(image.parentElement?.style.aspectRatio).toBe(aspect.replace(":", " / "));
		},
	);

	it("keeps Original at its natural aspect and defaults invalid fit values to contain", () => {
		const { rerender } = render(picture({ aspect: "auto", fit: "fill" }));
		expect(screen.getByRole("img").parentElement?.style.aspectRatio).toBe("");
		expect(getComputedStyle(screen.getByRole("img")).objectFit).toBe("contain");
		rerender(picture({ aspect: "constructor" }));
		expect(screen.getByRole("img").parentElement?.style.aspectRatio).toBe("");
	});

	it("supports an explicit crop without losing alt text, captions or outbound links", () => {
		render(
			<ImageBlock
				block={{ ...block, url: "https://example.com/work" }}
				config={{ src, alt: "Blue wolf", caption: "My artwork", aspect: "16:9", fit: "cover" }}
				colorMode="light"
				themeColors={themeColors}
			/>,
		);
		const image = screen.getByRole("img", { name: "Blue wolf" });
		expect(getComputedStyle(image).objectFit).toBe("cover");
		expect(screen.getByText("My artwork").tagName).toBe("FIGCAPTION");
		expect(screen.getByRole("link").getAttribute("href")).toBe("https://example.com/work");
	});

	it("prevents image link navigation in the editor preview", () => {
		render(
			<PreviewProvider>
				<ImageBlock
					block={{ ...block, url: "https://example.com/work" }}
					config={{ src }}
					colorMode="light"
					themeColors={themeColors}
				/>
			</PreviewProvider>,
		);
		expect(fireEvent.click(screen.getByRole("link"))).toBe(false);
	});

	it("skips missing or unsafe image sources", () => {
		const { rerender } = render(picture({ src: "" }));
		expect(screen.queryByRole("img")).toBeNull();
		rerender(picture({ src: "javascript:alert(1)" }));
		expect(screen.queryByRole("img")).toBeNull();
	});
});

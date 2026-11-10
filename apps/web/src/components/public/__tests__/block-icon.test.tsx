import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { BlockIcon } from "../block-icon";
import { PublicRuntimeProvider } from "../public-runtime";

describe("BlockIcon with a server-resolved glyph", () => {
	afterEach(cleanup);

	it("draws a brand path as a static svg", () => {
		const { container } = render(<BlockIcon icon="brand:x" svg={{ kind: "path", d: "M0 0h24" }} />);
		expect(container.querySelector("svg path")?.getAttribute("d")).toBe("M0 0h24");
	});

	it("draws lucide elements, including nested children", () => {
		const { container } = render(
			<BlockIcon
				icon="lucide:demo"
				svg={{
					kind: "lucide",
					node: [
						["circle", { cx: 12, cy: 12, r: 10, key: "c" }],
						["g", { key: "g" }, [["path", { d: "M1 1", key: "p" }]]],
					],
				}}
			/>,
		);
		expect(container.querySelector("svg circle")?.getAttribute("r")).toBe("10");
		expect(container.querySelector("svg g path")?.getAttribute("d")).toBe("M1 1");
	});

	it("renders nothing when the server found no such icon", () => {
		const { container } = render(<BlockIcon icon="lucide:nope" svg={null} />);
		expect(container.innerHTML).toBe("");
	});
	it("uses the editor runtime for unresolved preview icons without a public catalog", () => {
		const { container } = render(
			<PublicRuntimeProvider
				value={{
					submitContact: async () => {},
					vcardHref: () => undefined,
					renderUnresolvedIcon: (icon) => <span data-preview-icon={icon} />,
				}}
			>
				<BlockIcon icon="lucide:demo" />
			</PublicRuntimeProvider>,
		);
		expect(container.querySelector('[data-preview-icon="lucide:demo"]')).not.toBeNull();
	});
});

import { socialBrandMap } from "@linkden/ui/social-brands";
import { describe, expect, it } from "vitest";
import { resolveBlockIcon, withResolvedIcons } from "../block-icons";

describe("resolveBlockIcon (server-side icon resolution)", () => {
	it("resolves a brand glyph to its single path", async () => {
		const [slug, brand] = [...socialBrandMap.entries()][0] ?? [];
		expect(await resolveBlockIcon(`brand:${slug}`)).toEqual({ kind: "path", d: brand?.svgPath });
	});

	it("resolves prefixed and legacy bare lucide names to element lists", async () => {
		for (const icon of ["lucide:house", "house"]) {
			const resolved = await resolveBlockIcon(icon);
			expect(resolved?.kind).toBe("lucide");
			if (resolved?.kind !== "lucide") continue;
			expect(resolved.node.length).toBeGreaterThan(0);
			const [tag, attrs] = resolved.node[0] ?? [];
			expect(typeof tag).toBe("string");
			expect(attrs).toBeTypeOf("object");
		}
	});

	it("returns null for empty, unknown and prototype-chain names", async () => {
		for (const icon of [null, "", "brand:not-a-brand", "lucide:not-an-icon", "constructor"]) {
			expect(await resolveBlockIcon(icon)).toBeNull();
		}
	});

	it("is plain JSON, so it survives the RSC boundary", async () => {
		const resolved = await resolveBlockIcon("lucide:link");
		expect(JSON.parse(JSON.stringify(resolved))).toEqual(resolved);
	});
});

describe("withResolvedIcons", () => {
	it("adds iconSvg to every block and keeps the rest", async () => {
		const blocks = await withResolvedIcons([
			{ id: "a", icon: "lucide:house" },
			{ id: "b", icon: null },
		]);
		expect(blocks[0]?.id).toBe("a");
		expect(blocks[0]?.iconSvg?.kind).toBe("lucide");
		expect(blocks[1]?.iconSvg).toBeNull();
	});
});

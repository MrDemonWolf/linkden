import { describe, expect, it } from "vitest";
import { cn } from "../utils";

describe("cn", () => {
	it("preserves custom font sizes beside semantic text colors", () => {
		for (const size of ["h1", "h2", "body", "small", "micro"]) {
			expect(cn(`text-${size}`, "text-muted-foreground")).toBe(
				`text-${size} text-muted-foreground`,
			);
		}
	});

	it("merges font size and color independently, including responsive overrides", () => {
		expect(cn("text-small text-primary", "text-sm text-foreground")).toBe(
			"text-sm text-foreground",
		);
		expect(cn("md:text-xs md:text-primary", "md:text-body md:text-muted-foreground")).toBe(
			"md:text-body md:text-muted-foreground",
		);
	});

	it("retains conditional classes and ordinary utility conflict handling", () => {
		expect(cn("px-2", false, ["py-3"], { "px-4": true, hidden: false })).toBe("py-3 px-4");
	});
});

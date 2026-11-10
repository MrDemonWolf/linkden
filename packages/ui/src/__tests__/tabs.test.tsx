import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { Tabs, TabsList, TabsTrigger } from "../components/tabs";

afterEach(cleanup);

describe("TabsList", () => {
	// Base UI scrolls the active tab into view on mount using the tab's offsetLeft,
	// which is relative to the nearest positioned ancestor. An unpositioned list
	// therefore measured from a far-off ancestor and opened scrolled to its end,
	// hiding the active first tab (Settings → Wallet editor).
	it.each(["default", "pills", "bar"] as const)(
		"is positioned (%s variant) so it is its tabs' offsetParent",
		(variant) => {
			render(
				<Tabs defaultValue="business">
					<TabsList variant={variant} className="overflow-x-auto">
						<TabsTrigger value="business">Business</TabsTrigger>
						<TabsTrigger value="images">Images</TabsTrigger>
					</TabsList>
				</Tabs>,
			);
			expect(screen.getByRole("tablist").className.split(/\s+/)).toContain("relative");
		},
	);
});

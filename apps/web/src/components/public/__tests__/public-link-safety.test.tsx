import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { getThemeColors } from "@/lib/theme-colors";
import { LocationBlock } from "../location-block";
import { ProfileSocialIcons } from "../profile-social-icons";

const themeColors = getThemeColors("default", "light");
afterEach(cleanup);

describe("stored public link safety", () => {
	it("renders safe HTTP(S) social links and skips invalid stored URLs", () => {
		const urls = [
			"https://example.com/profile",
			"http://example.com/profile",
			"javascript:alert(1)",
			"data:text/html,example",
			"/admin/settings",
			"not a URL",
		];
		render(
			<ProfileSocialIcons
				networks={urls.map((url, i) => ({
					slug: `network-${i}`,
					name: `Network ${i}`,
					url,
					hex: "",
					svgPath: "",
				}))}
				colorMode="light"
				themeColors={themeColors}
			/>,
		);
		expect(screen.getAllByRole("link").map((link) => link.getAttribute("href"))).toEqual(
			urls.slice(0, 2),
		);
	});

	it("keeps a custom-map address readable without an unsafe anchor", () => {
		render(
			<LocationBlock
				block={{ id: "location", title: "Chicago", url: null, icon: null }}
				config={{ linkType: "custom", customLinkUrl: "javascript:alert(1)" }}
				colorMode="light"
				themeColors={themeColors}
			/>,
		);
		expect(screen.getByText("Chicago")).toBeTruthy();
		expect(screen.queryByRole("link")).toBeNull();
	});
});

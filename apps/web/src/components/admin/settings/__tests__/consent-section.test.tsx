import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ConsentSection } from "../consent-section";

function props() {
	return {
		enabled: true,
		bannerText: "Our saved custom message",
		privacyUrl: "https://example.com/privacy",
		categories: { analytics: true, marketing: true, functional: false },
		onEnabledChange: vi.fn(),
		onBannerTextChange: vi.fn(),
		onPrivacyUrlChange: vi.fn(),
		onCategoriesChange: vi.fn(),
	};
}

afterEach(cleanup);

describe("ConsentSection", () => {
	it("offers embedded-media settings without retired analytics controls or changing custom text", () => {
		const options = props();
		render(<ConsentSection {...options} />);
		expect(screen.queryByRole("switch", { name: /analytics/i })).toBeNull();
		expect((screen.getByLabelText("Banner Text") as HTMLTextAreaElement).value).toBe(
			options.bannerText,
		);
		fireEvent.click(screen.getByRole("switch", { name: "Embedded media" }));
		expect(options.onCategoriesChange).toHaveBeenCalledWith({
			...options.categories,
			functional: true,
		});
		expect(options.onBannerTextChange).not.toHaveBeenCalled();
		expect(options.onPrivacyUrlChange).not.toHaveBeenCalled();
	});

	it("explains that turning the banner off allows embeds without a prompt", () => {
		const options = { ...props(), enabled: false };
		render(<ConsentSection {...options} />);
		expect(screen.getByText(/supported embeds can load without asking/i)).toBeTruthy();
		expect(screen.queryByRole("switch", { name: "Embedded media" })).toBeNull();
		expect(screen.queryByLabelText("Banner Text")).toBeNull();
		fireEvent.click(screen.getByRole("switch", { name: "Show consent banner" }));
		expect(options.onEnabledChange.mock.calls[0]?.[0]).toBe(true);
	});
});

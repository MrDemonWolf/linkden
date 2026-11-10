import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AdminFooter } from "../admin-footer";

vi.mock("@/components/ui/theme-toggle", () => ({ ThemeToggle: () => <div>Theme controls</div> }));

beforeEach(() => vi.stubEnv("NEXT_PUBLIC_APP_VERSION", "0.5.0"));
afterEach(() => {
	cleanup();
	vi.unstubAllEnvs();
});

describe("admin footer", () => {
	it("keeps branding accessible and opens the project link safely", () => {
		render(<AdminFooter brandingEnabled />);
		const link = screen.getByRole("link", { name: /Powered by LinkDen/ });
		expect(link.getAttribute("target")).toBe("_blank");
		expect(link.getAttribute("rel")).toBe("noopener noreferrer");
		expect(screen.getByRole("contentinfo")).not.toBeNull();
		expect(screen.getByTitle("Version 0.5.0")).not.toBeNull();
	});

	it("respects disabled admin branding while keeping version and theme controls", () => {
		render(<AdminFooter brandingEnabled={false} />);
		expect(screen.queryByRole("link")).toBeNull();
		expect(screen.getByTitle("Version 0.5.0")).not.toBeNull();
		expect(screen.getByText("Theme controls")).not.toBeNull();
	});

	it("labels development builds without putting that label on production", () => {
		vi.stubEnv("NODE_ENV", "development");
		const { rerender } = render(<AdminFooter brandingEnabled />);
		expect(screen.getByText("Development")).not.toBeNull();
		vi.stubEnv("NODE_ENV", "production");
		rerender(<AdminFooter brandingEnabled />);
		expect(screen.queryByText("Development")).toBeNull();
	});
});

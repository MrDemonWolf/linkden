import { getPresetById, type ShaderBannerPreset } from "@linkden/ui/banner-presets";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const shaderProps = vi.fn();
vi.mock("@paper-design/shaders-react", () => {
	const Stub = (props: Record<string, unknown>) => {
		shaderProps(props);
		return <canvas data-testid="shader" />;
	};
	return { MeshGradient: Stub, NeuroNoise: Stub, Waves: Stub, GrainGradient: Stub, Swirl: Stub };
});

import { ShaderBanner } from "../shader-banner";

const preset = getPresetById("shader-mesh-gradient") as ShaderBannerPreset;

function mockReducedMotion(reduce: boolean) {
	window.matchMedia = ((query: string) => ({
		matches: reduce && query.includes("prefers-reduced-motion"),
		media: query,
		addEventListener: () => {},
		removeEventListener: () => {},
	})) as unknown as typeof window.matchMedia;
}

const lastProps = () => shaderProps.mock.calls.at(-1)?.[0] as Record<string, unknown>;

describe("ShaderBanner motion", () => {
	afterEach(() => {
		cleanup();
		shaderProps.mockReset();
	});

	it("freezes the animation for visitors who prefer reduced motion", async () => {
		mockReducedMotion(true);
		render(<ShaderBanner preset={preset} showPauseControl />);
		await screen.findByTestId("shader");
		expect(lastProps()).toMatchObject({ speed: 0, frame: 0 });
		// Nothing moves, so there is nothing to pause.
		expect(screen.queryByRole("button", { name: /pause/i })).toBeNull();
	});

	it("animates otherwise, with a pause control on the public cover", async () => {
		mockReducedMotion(false);
		render(<ShaderBanner preset={preset} showPauseControl />);
		await screen.findByTestId("shader");
		expect(lastProps().speed).not.toBe(0);

		act(() => fireEvent.click(screen.getByRole("button", { name: "Pause banner animation" })));
		expect(lastProps().speed).toBe(0);
		expect(screen.getByRole("button", { name: "Play banner animation" })).toBeTruthy();
	});
});

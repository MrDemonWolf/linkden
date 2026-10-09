import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { CONSENT_VERSION } from "../consent-banner";
import { EmbedBlock } from "../embed-block";

const block = {
	id: "e1",
	title: "My clip",
	embedType: null,
	embedUrl: "https://player.example.com/embed/1",
};

const iframe = () => document.querySelector("iframe");

describe("EmbedBlock consent gate", () => {
	beforeEach(() => localStorage.clear());
	afterEach(cleanup);

	it("shows a click-to-load facade instead of contacting the provider", () => {
		render(<EmbedBlock block={block} config={{}} colorMode="light" consentRequired />);
		expect(iframe()).toBeNull();
		expect(screen.getByText(/player\.example\.com/)).toBeTruthy();

		fireEvent.click(screen.getByRole("button", { name: /load/i }));
		expect(iframe()?.getAttribute("src")).toBe(block.embedUrl);
	});

	it("loads straight away when the visitor allowed embedded media", () => {
		localStorage.setItem(
			"linkden-consent",
			JSON.stringify({ functional: true, v: CONSENT_VERSION, ts: Date.now() }),
		);
		render(<EmbedBlock block={block} config={{}} colorMode="light" consentRequired />);
		expect(iframe()).not.toBeNull();
	});

	it("loads once the visitor grants it in the banner", () => {
		render(<EmbedBlock block={block} config={{}} colorMode="light" consentRequired />);
		act(() => {
			window.dispatchEvent(
				new CustomEvent("linkden:consent", {
					detail: { essential: true, analytics: false, marketing: false, functional: true },
				}),
			);
		});
		expect(iframe()).not.toBeNull();
	});

	it("stays gated after 'Essential only'", () => {
		localStorage.setItem(
			"linkden-consent",
			JSON.stringify({ functional: false, v: CONSENT_VERSION, ts: Date.now() }),
		);
		render(<EmbedBlock block={block} config={{}} colorMode="light" consentRequired />);
		expect(iframe()).toBeNull();
	});

	it("has no gate when the consent banner is off", () => {
		render(<EmbedBlock block={block} config={{}} colorMode="light" consentRequired={false} />);
		expect(iframe()).not.toBeNull();
	});
});

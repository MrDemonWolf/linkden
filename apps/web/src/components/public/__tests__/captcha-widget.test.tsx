import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
	CAPTCHA_VERIFY_URLS,
	EXPECTED_CAPTCHA_ACTION,
} from "../../../../../../packages/api/src/utils/captcha";
import {
	CAPTCHA_ACTION,
	CaptchaWidget,
	captchaRenderParams,
	captchaScriptUrl,
	isCaptchaRequired,
	loadCaptchaApi,
	resolveCaptchaProvider,
} from "../captcha-widget";

const w = window as unknown as Record<string, unknown>;

/** The injected provider script, and a way to "load" it (calls its onload callback). */
function injectedScript(provider: string) {
	const script = document.head.querySelector<HTMLScriptElement>(`script[src*="${provider}"]`);
	if (!script) throw new Error(`no ${provider} script injected`);
	const callback = new URL(script.src).searchParams.get("onload") ?? "";
	return { script, load: () => (w[callback] as () => void)() };
}

describe("CAPTCHA wiring parity with the server", () => {
	it("binds the widget to the action the server verifies", () => {
		expect(CAPTCHA_ACTION).toBe(EXPECTED_CAPTCHA_ACTION);
	});

	it("can render every provider the server can verify", () => {
		for (const provider of Object.keys(CAPTCHA_VERIFY_URLS)) {
			expect(resolveCaptchaProvider(provider, "site-key")).toBe(provider);
		}
	});
});

describe("provider resolution", () => {
	it("knows when the server will demand a token", () => {
		expect(isCaptchaRequired("turnstile")).toBe(true);
		expect(isCaptchaRequired("none")).toBe(false);
		expect(isCaptchaRequired(undefined)).toBe(false);
	});

	it("renders nothing without a site key or for an unknown provider", () => {
		expect(resolveCaptchaProvider("turnstile", null)).toBeNull();
		expect(resolveCaptchaProvider("none", "k")).toBeNull();
		expect(resolveCaptchaProvider("friendlycaptcha", "k")).toBeNull();
	});

	it("loads each provider's explicit-render script with an onload callback", () => {
		expect(captchaScriptUrl("turnstile", "cb")).toBe(
			"https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit&onload=cb",
		);
		expect(captchaScriptUrl("recaptcha", "cb")).toMatch(
			/^https:\/\/www\.google\.com\/recaptcha\/api\.js\?render=explicit&onload=cb$/,
		);
		expect(captchaScriptUrl("hcaptcha", "cb")).toMatch(
			/^https:\/\/js\.hcaptcha\.com\/1\/api\.js\?/,
		);
	});

	it("sends the action with Turnstile and reports expiry as no token", () => {
		const onToken = vi.fn();
		const params = captchaRenderParams("turnstile", { siteKey: "k", theme: "dark", onToken });
		expect(params).toMatchObject({ sitekey: "k", theme: "dark", action: "contact" });
		(params.callback as (t: string) => void)("tok");
		(params["expired-callback"] as () => void)();
		expect(onToken.mock.calls).toEqual([["tok"], [null]]);
		expect(
			captchaRenderParams("hcaptcha", { siteKey: "k", theme: "light", onToken }),
		).not.toHaveProperty("action");
	});
});

describe("loadCaptchaApi / CaptchaWidget", () => {
	afterEach(() => {
		cleanup();
		for (const s of document.head.querySelectorAll("script")) s.remove();
		delete w.turnstile;
		delete w.hcaptcha;
	});

	it("retries after a failed script load instead of caching the failure", async () => {
		const first = loadCaptchaApi("hcaptcha");
		const { script } = injectedScript("hcaptcha");
		script.onerror?.(new Event("error"));
		await expect(first).rejects.toThrow(/failed to load/);
		expect(document.head.querySelector('script[src*="hcaptcha"]')).toBeNull();

		const second = loadCaptchaApi("hcaptcha");
		w.hcaptcha = { render: vi.fn(() => "id") };
		injectedScript("hcaptcha").load();
		await expect(second).resolves.toBe(w.hcaptcha);
	});

	it("renders the provider widget with the public site key and relays its token", async () => {
		const render$ = vi.fn((_el: HTMLElement, params: Record<string, unknown>) => {
			(params.callback as (t: string) => void)("solved");
			return "widget-1";
		});
		const remove = vi.fn();
		w.turnstile = { render: render$, remove };
		const onToken = vi.fn();
		const { unmount } = render(
			<CaptchaWidget
				id="cap"
				provider="turnstile"
				siteKey="public-key"
				colorMode="dark"
				onToken={onToken}
				errorColor="#f00"
			/>,
		);
		act(() => injectedScript("turnstile").load());

		await waitFor(() => expect(onToken).toHaveBeenCalledWith("solved"));
		expect(render$.mock.calls[0]?.[1]).toMatchObject({
			sitekey: "public-key",
			theme: "dark",
			action: "contact",
		});
		unmount();
		expect(remove).toHaveBeenCalledWith("widget-1");
	});

	it("tells the visitor when the challenge can't load", async () => {
		render(
			<CaptchaWidget
				id="cap"
				provider="recaptcha"
				siteKey="k"
				colorMode="light"
				onToken={vi.fn()}
				errorColor="#f00"
			/>,
		);
		const script = document.head.querySelector<HTMLScriptElement>('script[src*="recaptcha"]');
		act(() => script?.onerror?.(new Event("error")));
		expect((await screen.findByRole("alert")).textContent).toMatch(/couldn.t load/i);
	});
});

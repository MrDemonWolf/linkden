"use client";

import { useEffect, useEffectEvent, useRef, useState } from "react";

// ─── CAPTCHA widget ────────────────────────────────────────────────────────
// Renders the configured provider's challenge with its public site key and
// reports the token. Verification stays server-side and fails closed
// (packages/api/src/utils/captcha.ts) — this only obtains the token. Tokens are
// single-use: the form remounts the widget (new `key`) after every attempt.
// Provider script/frame origins are allowed in the CSP in next.config.ts.

export type CaptchaProvider = "turnstile" | "recaptcha" | "hcaptcha";

const PROVIDERS: readonly CaptchaProvider[] = ["turnstile", "recaptcha", "hcaptcha"];

/** Must equal EXPECTED_CAPTCHA_ACTION in packages/api/src/utils/captcha.ts. */
export const CAPTCHA_ACTION = "contact";

const SCRIPT_URL: Record<CaptchaProvider, string> = {
	turnstile: "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit",
	// v2 checkbox (explicit render) — the docs describe reCAPTCHA as the checkbox challenge.
	recaptcha: "https://www.google.com/recaptcha/api.js?render=explicit",
	hcaptcha: "https://js.hcaptcha.com/1/api.js?render=explicit&recaptchacompat=off",
};

const GLOBAL_NAME: Record<CaptchaProvider, string> = {
	turnstile: "turnstile",
	recaptcha: "grecaptcha",
	hcaptcha: "hcaptcha",
};

/** True when the admin turned CAPTCHA on — the server then rejects token-less submits. */
export function isCaptchaRequired(provider: string | null | undefined): boolean {
	return !!provider && provider !== "none";
}

/** The provider to render, or null when CAPTCHA is off or not fully configured. */
export function resolveCaptchaProvider(
	provider: string | null | undefined,
	siteKey: string | null | undefined,
): CaptchaProvider | null {
	if (!siteKey || !provider) return null;
	return (PROVIDERS as readonly string[]).includes(provider) ? (provider as CaptchaProvider) : null;
}

export function captchaScriptUrl(provider: CaptchaProvider, onloadCallback: string): string {
	return `${SCRIPT_URL[provider]}&onload=${encodeURIComponent(onloadCallback)}`;
}

interface RenderHandlers {
	siteKey: string;
	theme: "light" | "dark";
	onToken: (token: string | null) => void;
}

/** Explicit-render parameters for each provider's `render(container, params)`. */
export function captchaRenderParams(
	provider: CaptchaProvider,
	{ siteKey, theme, onToken }: RenderHandlers,
): Record<string, unknown> {
	const common = {
		sitekey: siteKey,
		theme,
		callback: (token: string) => onToken(token || null),
		"expired-callback": () => onToken(null),
		"error-callback": () => onToken(null),
	};
	// Only Turnstile takes an action at render time; the server rejects a token
	// whose reported action differs from CAPTCHA_ACTION.
	return provider === "turnstile" ? { ...common, action: CAPTCHA_ACTION } : common;
}

interface CaptchaApi {
	render(container: HTMLElement, params: Record<string, unknown>): string | number;
	remove?(widgetId: string | number): void;
}

const loaders = new Map<CaptchaProvider, Promise<CaptchaApi>>();

/** Load the provider script once per page; resolves with its global API. */
export function loadCaptchaApi(provider: CaptchaProvider): Promise<CaptchaApi> {
	const cached = loaders.get(provider);
	if (cached) return cached;
	const promise = new Promise<CaptchaApi>((resolve, reject) => {
		const w = window as unknown as Record<string, unknown>;
		const callback = `__linkdenCaptchaLoaded_${provider}`;
		const script = document.createElement("script");
		w[callback] = () => {
			delete w[callback];
			const api = w[GLOBAL_NAME[provider]] as CaptchaApi | undefined;
			if (api && typeof api.render === "function") resolve(api);
			else reject(new Error("CAPTCHA API unavailable"));
		};
		script.src = captchaScriptUrl(provider, callback);
		script.async = true;
		script.defer = true;
		script.onerror = () => {
			delete w[callback];
			loaders.delete(provider);
			script.remove();
			reject(new Error("CAPTCHA script failed to load"));
		};
		document.head.appendChild(script);
	});
	loaders.set(provider, promise);
	return promise;
}

interface CaptchaWidgetProps {
	id: string;
	provider: CaptchaProvider;
	siteKey: string;
	colorMode: "light" | "dark";
	onToken: (token: string | null) => void;
	errorColor: string;
}

export function CaptchaWidget({
	id,
	provider,
	siteKey,
	colorMode,
	onToken,
	errorColor,
}: CaptchaWidgetProps) {
	const containerRef = useRef<HTMLDivElement>(null);
	const [loadFailed, setLoadFailed] = useState(false);
	const emitToken = useEffectEvent((token: string | null) => onToken(token));
	// The theme is read once per mount: re-rendering on a colour-mode toggle
	// would throw away a solved challenge.
	const initialTheme = useEffectEvent(() => colorMode);

	useEffect(() => {
		const container = containerRef.current;
		if (!container) return;
		let cancelled = false;
		let api: CaptchaApi | undefined;
		let widgetId: string | number | undefined;
		// A fresh child per mount: reCAPTCHA refuses to render twice into one node.
		const target = document.createElement("div");
		container.appendChild(target);
		loadCaptchaApi(provider)
			.then((loaded) => {
				if (cancelled) return;
				api = loaded;
				widgetId = loaded.render(
					target,
					captchaRenderParams(provider, {
						siteKey,
						theme: initialTheme(),
						onToken: (token) => emitToken(token),
					}),
				);
			})
			.catch(() => {
				if (!cancelled) setLoadFailed(true);
			});
		return () => {
			cancelled = true;
			if (api?.remove && widgetId !== undefined) {
				try {
					api.remove(widgetId);
				} catch {
					// Already gone.
				}
			}
			target.remove();
		};
	}, [provider, siteKey]);

	return (
		<div>
			{/* Focus target for the "complete the spam check" validation error. */}
			<div id={id} ref={containerRef} tabIndex={-1} className="min-h-[65px] outline-none" />
			{loadFailed && (
				<p className="mt-1 text-sm" style={{ color: errorColor }} role="alert">
					The spam check couldn&apos;t load. Disable any content blocker for this page or reload to
					try again.
				</p>
			)}
		</div>
	);
}

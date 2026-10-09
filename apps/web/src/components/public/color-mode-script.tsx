export const COLOR_MODE_COOKIE = "linkden-color-mode";
/**
 * Client hint carrying the OS light/dark preference (Chromium). Requested via
 * `Accept-CH` on "/" in next.config.ts, so from the second navigation on the
 * server can render a `system` default in the right palette instead of
 * painting light and flipping after hydration. A request header — nothing is
 * stored on the visitor's device.
 */
export const COLOR_SCHEME_HINT_HEADER = "sec-ch-prefers-color-scheme";

type ColorMode = "light" | "dark";

/**
 * The mode to server-render: the visitor's explicit toggle, else for a
 * `system` default the OS preference client hint when the browser sent one,
 * else the admin default.
 */
export function resolveInitialColorMode(opts: {
	cookieMode: string | undefined;
	systemHint: string | undefined;
	defaultColorMode: string;
}): ColorMode {
	const { cookieMode, systemHint, defaultColorMode } = opts;
	if (cookieMode === "light" || cookieMode === "dark") return cookieMode;
	if (defaultColorMode === "system" && (systemHint === "light" || systemHint === "dark")) {
		return systemHint;
	}
	return defaultColorMode === "dark" ? "dark" : "light";
}

/**
 * Resolves the visitor's color mode before first paint and stamps it on
 * `<html data-ld-mode>`: cookie → (system ? matchMedia : admin default).
 * `PublicPage` adopts the stamped value on mount, so a `system` default with no
 * cookie still ends up right without a reload. Inline on purpose — a module
 * script would run after hydration.
 */
export function ColorModeScript({ defaultColorMode }: { defaultColorMode: string }) {
	// Whitelisted before interpolation so a stray settings value can't break
	// out of the script.
	const fallback =
		defaultColorMode === "dark" || defaultColorMode === "system" ? defaultColorMode : "light";
	const resolve =
		fallback === "system"
			? 'matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light"'
			: JSON.stringify(fallback);
	const js = `(function(){try{var m=document.cookie.match(/(?:^|; )${COLOR_MODE_COOKIE}=(light|dark)/);document.documentElement.dataset.ldMode=m?m[1]:(${resolve})}catch(e){}})()`;
	// biome-ignore lint/security/noDangerouslySetInnerHtml: static, whitelisted script
	return <script dangerouslySetInnerHTML={{ __html: js }} />;
}

export const COLOR_MODE_COOKIE = "linkden-color-mode";

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

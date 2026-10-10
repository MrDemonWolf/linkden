// Admin custom CSS as the public page embeds it. The live page renders it as
// is (it is the owner's own page). The admin preview renders the same
// PublicPage *inside the authenticated admin document*, where an imported
// backup's CSS could restyle admin controls or beacon out preview content
// (`a[href^=…]{background:url(https://…)}`), so there it is confined:
//   - nested in `@scope (.ld-page)` so no selector can reach the admin UI;
//   - external fetches neutralised (url() to another origin, @import,
//     image-set() strings), keeping same-origin and /api/images assets;
//   - rejected outright if its braces don't balance, since an early `}` would
//     close the scope and let the rest apply to the whole admin page.

const MAX_CSS = 20_000;

/** Keep a `</style` in the CSS from closing the inline <style> element. */
function escapeStyleClose(css: string): string {
	return css.replace(/<\/style/gi, "<\\/style");
}

export function liveCustomCss(css: string): string {
	return escapeStyleClose(css.slice(0, MAX_CSS));
}

/** True when `{`/`}` pair up outside comments, strings and escapes. */
export function hasBalancedBraces(css: string): boolean {
	let depth = 0;
	for (let i = 0; i < css.length; i++) {
		const ch = css[i];
		if (ch === "\\") {
			i++;
		} else if (ch === "/" && css[i + 1] === "*") {
			const end = css.indexOf("*/", i + 2);
			if (end === -1) return false;
			i = end + 1;
		} else if (ch === '"' || ch === "'") {
			let j = i + 1;
			while (j < css.length && css[j] !== ch) {
				if (css[j] === "\\") j++;
				if (css[j] === "\n") return false;
				j++;
			}
			if (j >= css.length) return false;
			i = j;
		} else if (ch === "{") {
			depth++;
		} else if (ch === "}") {
			depth--;
			if (depth < 0) return false;
		}
	}
	return depth === 0;
}

function isAllowedAsset(target: string, allowedOrigins: ReadonlySet<string>): boolean {
	const t = target.trim();
	if (!t || t.startsWith("data:") || t.startsWith("#")) return true;
	// Relative URLs resolve against the admin origin — same-origin, fine.
	if (!/^[a-z][a-z0-9+.-]*:/i.test(t) && !t.startsWith("//")) return true;
	try {
		const url = new URL(t.startsWith("//") ? `https:${t}` : t);
		return allowedOrigins.has(url.origin);
	} catch {
		return false;
	}
}

/**
 * Drop every way the CSS could make the admin's browser fetch a foreign URL.
 * Run on escape-free CSS (see `previewCustomCss`): an escaped `\75 rl(` is
 * still a url() to the CSS parser.
 */
export function stripExternalFetches(css: string, allowedOrigins: ReadonlySet<string>): string {
	const kept: string[] = [];
	const out = css
		.replace(/@import\b[^;]*;?/gi, "")
		// image-set()/src() accept bare strings as URLs — invalidate the declaration.
		.replace(/\b(?:-webkit-)?image-set\s*\(/gi, "invalid-image-set(")
		.replace(/\bsrc\s*\(/gi, "invalid-src(")
		.replace(
			/url\(\s*(?:"([^"]*)"|'([^']*)'|([^)"'\s]*))\s*\)/gi,
			(match, dq?: string, sq?: string, bare?: string) => {
				if (!isAllowedAsset(dq ?? sq ?? bare ?? "", allowedOrigins)) return "none";
				kept.push(match);
				return `\u0000${kept.length - 1}\u0000`;
			},
		)
		// Any url( the pattern couldn't parse is invalidated rather than trusted.
		.replace(/url\(/gi, "invalid-url(");
	// biome-ignore lint/suspicious/noControlCharactersInRegex: NUL-delimited placeholders
	return out.replace(/\u0000(\d+)\u0000/g, (_, i: string) => kept[Number(i)] ?? "none");
}

/** The preview-safe form (see the header comment); "" when it can't be confined. */
export function previewCustomCss(css: string, allowedOrigins: ReadonlySet<string>): string {
	// Escapes go first (preview only — an escaped glyph in `content:` just
	// renders without it): an escaped `url`, `@import` or brace would otherwise
	// slip past the checks below. NULs are reserved for the url() placeholders.
	const bounded = css
		.slice(0, MAX_CSS)
		.replace(/\\(?:[0-9a-fA-F]{1,6}\s?|[\s\S])?/g, "")
		// biome-ignore lint/suspicious/noControlCharactersInRegex: NULs are reserved for placeholders
		.replace(/\u0000/g, "");
	if (!hasBalancedBraces(bounded)) return "";
	return escapeStyleClose(
		`@scope (.ld-page) {\n${stripExternalFetches(bounded, allowedOrigins)}\n}`,
	);
}

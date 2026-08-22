/**
 * Legacy admin URL → new destination. The edge proxy (`proxy.ts`) answers every
 * old route with a real 307 via `legacyAdminRedirect`; each old route also
 * keeps a page-level shim calling `redirect(legacyAdminPath(from, tab))` as a
 * fallback (the shim alone streams a 200 + client redirect because of
 * `app/admin/loading.tsx`). Both derive from one pure, unit-tested map (see
 * `__tests__/admin-redirects.test.ts`).
 *
 * Returns a plain string rather than a typed `Route` so the module stays free
 * of Next's generated route types (and testable outside Next).
 */

const ROOT: Record<string, string> = {
	"/admin": "/admin/links",
	"/admin/builder": "/admin/links",
	"/admin/social": "/admin/links/social",
	"/admin/appearance": "/admin/design",
	"/admin/analytics": "/admin/insights",
	"/admin/connections": "/admin/inbox",
	"/admin/forms": "/admin/inbox",
	"/admin/account": "/admin/settings",
	"/admin/wallet": "/admin/settings/wallet",
	// `/admin/settings` without a tab IS the new Account page — the caller must
	// only redirect when `tab` is present.
	"/admin/settings": "/admin/settings",
};

const TABS: Record<string, Record<string, string>> = {
	"/admin/builder": {
		profile: "/admin/links/profile",
		social: "/admin/links/social",
	},
	"/admin/settings": {
		seo: "/admin/design/seo",
		branding: "/admin/design/branding",
		privacy: "/admin/design/branding",
		email: "/admin/settings/email",
		features: "/admin/settings/integrations",
		data: "/admin/settings/data",
	},
};

/** Map an old admin path (+ optional legacy `?tab=`) to its new route. Unknown tabs land on the destination root. */
export function legacyAdminPath(from: string, tab?: string | null): string {
	const path = from.replace(/\/+$/, "") || "/admin";
	return (tab && TABS[path]?.[tab]) || ROOT[path] || "/admin/links";
}

/**
 * Edge-proxy variant: the new route when `pathname` (+ optional legacy `?tab=`)
 * is a legacy URL, otherwise `null`. `/admin/settings` is legacy only with a
 * known tab (without one it IS the Account page); everything not in the map
 * (new destinations, login/setup, unknown paths) is left alone.
 */
export function legacyAdminRedirect(pathname: string, tab?: string | null): string | null {
	const path = pathname.replace(/\/+$/, "") || "/admin";
	const tabbed = (tab && TABS[path]?.[tab]) || null;
	if (tabbed) return tabbed;
	const root = ROOT[path];
	if (!root || root === path) return null;
	return root;
}

"use client";

import { useEffect } from "react";

/**
 * Registers the site-wide service worker (public/sw.js) at scope "/".
 * Production only: a dev service worker caches stale HMR chunks.
 */
export function SwRegister() {
	useEffect(() => {
		if (process.env.NODE_ENV !== "production") return;
		if (!("serviceWorker" in navigator)) return;
		const sw = navigator.serviceWorker;
		sw.register("/sw.js", { scope: "/" })
			// Drop the pre-0.6 admin-only registration (scope /admin) so one
			// root worker controls every page.
			.then(() => sw.getRegistrations())
			.then((regs) => {
				for (const r of regs) if (new URL(r.scope).pathname !== "/") r.unregister();
			})
			.catch(() => {});
	}, []);
	return null;
}

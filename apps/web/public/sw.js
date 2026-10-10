// LinkDen service worker — root scope. Bump CACHE_VERSION whenever this file's
// caching policy changes; the app version (`?v=` on the registration URL, from
// version.json via sw-register.tsx) rolls the cache on every release.
//
//   public /           → network-first (navigation preload), cached copy on
//                        failure, then /offline. Only a 2xx render is stored, under
//                        one "/" key whatever the query (?fbclid=, ?utm_*…); the
//                        API-outage page is a 5xx and never replaces the good copy.
//   other navigations  → network-only, then /offline (never cache admin HTML)
//   /_next/static/*    → cache-first (content-hashed, immutable), capped
//   /api, /trpc, POST… → never touched (auth + data must always hit the network)
const CACHE_VERSION = "v4";
const APP_VERSION = (() => {
	try {
		return new URL(self.location.href).searchParams.get("v") || "0";
	} catch {
		return "0";
	}
})();
const CACHE_NAME = `linkden-${CACHE_VERSION}-${APP_VERSION}`;
const OFFLINE_URL = "/offline";
const HOME_KEY = "/";
// Hashed chunks from earlier deploys of the same release would otherwise pile up.
const MAX_STATIC_ENTRIES = 300;

self.addEventListener("install", (event) => {
	event.waitUntil(
		caches
			.open(CACHE_NAME)
			.then((cache) => cache.add(new Request(OFFLINE_URL, { cache: "reload" })))
			.then(() => self.skipWaiting()),
	);
});

self.addEventListener("activate", (event) => {
	event.waitUntil(
		Promise.all([
			caches
				.keys()
				.then((keys) =>
					Promise.all(
						keys
							.filter((key) => key !== CACHE_NAME && key.startsWith("linkden-"))
							.map((key) => caches.delete(key)),
					),
				),
			// Start the navigation request while the worker boots instead of after.
			self.registration?.navigationPreload?.enable().catch(() => {}),
		]).then(() => self.clients.claim()),
	);
});

/** The preloaded navigation response when there is one, else a normal fetch. */
async function networkFirst(event) {
	try {
		const preloaded = await event.preloadResponse;
		if (preloaded) return preloaded;
	} catch {
		// Preload failed or unsupported — fall through to fetch.
	}
	return fetch(event.request);
}

async function trimStatic(cache) {
	const keys = await cache.keys();
	const statics = keys.filter((req) => new URL(req.url).pathname.startsWith("/_next/static/"));
	const excess = statics.length - MAX_STATIC_ENTRIES;
	// cache.keys() is in insertion order — drop the oldest.
	for (let i = 0; i < excess; i++) await cache.delete(statics[i]);
}

self.addEventListener("fetch", (event) => {
	const { request } = event;
	if (request.method !== "GET") return;
	const url = new URL(request.url);
	if (url.origin !== self.location.origin) return;
	if (url.pathname.startsWith("/api") || url.pathname.startsWith("/trpc")) return;

	if (request.mode === "navigate") {
		if (url.pathname !== "/") {
			event.respondWith(networkFirst(event).catch(() => caches.match(OFFLINE_URL)));
			return;
		}
		event.respondWith(
			networkFirst(event)
				.then((response) => {
					// 2xx only: the API-outage render is a 500 and must not replace the
					// last good copy that offline visits fall back to.
					if (response.ok) {
						const clone = response.clone();
						event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.put(HOME_KEY, clone)));
					}
					return response;
				})
				.catch(async () => {
					const cached = await caches.match(HOME_KEY);
					return cached || caches.match(OFFLINE_URL);
				}),
		);
		return;
	}

	if (url.pathname.startsWith("/_next/static/")) {
		event.respondWith(
			caches.match(request).then(
				(cached) =>
					cached ||
					fetch(request).then((response) => {
						if (response.ok) {
							const clone = response.clone();
							event.waitUntil(
								caches
									.open(CACHE_NAME)
									.then((cache) => cache.put(request, clone).then(() => trimStatic(cache))),
							);
						}
						return response;
					}),
			),
		);
	}
	// Everything else: network only.
});

// LinkDen service worker — root scope. Bump CACHE_NAME whenever this file changes.
//
//   navigations        → network-first, cached copy on failure, then /offline
//   /_next/static/*    → cache-first (content-hashed, immutable)
//   /api, /trpc, POST… → never touched (auth + data must always hit the network)
const CACHE_NAME = "linkden-v2";
const OFFLINE_URL = "/offline";

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
		caches
			.keys()
			.then((keys) =>
				Promise.all(
					keys
						.filter((key) => key !== CACHE_NAME && key.startsWith("linkden-"))
						.map((key) => caches.delete(key)),
				),
			)
			.then(() => self.clients.claim()),
	);
});

self.addEventListener("fetch", (event) => {
	const { request } = event;
	if (request.method !== "GET") return;
	const url = new URL(request.url);
	if (url.origin !== self.location.origin) return;
	if (url.pathname.startsWith("/api") || url.pathname.startsWith("/trpc")) return;

	if (request.mode === "navigate") {
		event.respondWith(
			fetch(request)
				.then((response) => {
					if (response.ok) {
						const clone = response.clone();
						event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.put(request, clone)));
					}
					return response;
				})
				.catch(async () => {
					const cached = await caches.match(request);
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
							event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.put(request, clone)));
						}
						return response;
					}),
			),
		);
	}
	// Everything else: network only.
});

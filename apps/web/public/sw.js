// LinkDen Admin Service Worker — Network-first with cache fallback
const CACHE_NAME = "linkden-admin-v1";
const ADMIN_ASSET_PATTERN = /\.(js|css|woff2?|ttf|png|svg|ico)(\?.*)?$/;

self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // Only handle same-origin requests within /admin scope
  if (url.origin !== self.location.origin) return;
  if (!url.pathname.startsWith("/admin") && !ADMIN_ASSET_PATTERN.test(url.pathname)) return;

  // Only cache GET requests
  if (event.request.method !== "GET") return;

  // Network-first for static assets, network-only for everything else
  if (ADMIN_ASSET_PATTERN.test(url.pathname)) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => caches.match(event.request))
    );
  }
  // Navigation and API requests — always network, no interception on failure
});

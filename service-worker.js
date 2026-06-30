const CACHE_VERSION = "ai-lifecycle-pwa-v2";
const APP_SHELL = [
  "./manifest.webmanifest",
  "./pwa-icon.svg",
  "./pwa-maskable-icon.svg"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== CACHE_VERSION).map((key) => caches.delete(key)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const request = event.request;

  if (request.method !== "GET") {
    return;
  }

  const isNavigation = request.mode === "navigate";
  const isBuildAsset =
    request.destination === "script" ||
    request.destination === "style" ||
    request.url.includes("/assets/");

  if (isNavigation || isBuildAsset) {
    event.respondWith(
      fetch(request)
        .then((networkResponse) => {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_VERSION).then((cache) => {
            cache.put(request, responseClone);
          });
          return networkResponse;
        })
        .catch(() => caches.match(request).then((cachedResponse) => cachedResponse || caches.match("./")))
    );
    return;
  }

  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }

      return fetch(request)
        .then((networkResponse) => {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_VERSION).then((cache) => {
            cache.put(request, responseClone);
          });
          return networkResponse;
        })
        .catch(() => caches.match("./"));
    })
  );
});

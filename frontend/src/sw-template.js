/* Service worker for offline use. Built into dist/sw.js by vite.config.js;
   the two placeholders below are filled in at build time. */
const CACHE = "field-app-__CACHE_VERSION__";
const PRECACHE = __PRECACHE_FILES__;
const scope = new URL(self.registration.scope);
const ONLINE_ONLY = ["/api/", "/admin", "/up"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(["./", ...PRECACHE.filter((f) => f !== "index.html")]))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith("field-app-") && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);
  if (request.method !== "GET" || url.origin !== scope.origin) return;
  if (ONLINE_ONLY.some((p) => url.pathname.startsWith(p))) return;

  // Page loads: try the network so updates arrive, fall back to the cached app.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE).then((cache) => cache.put("./", copy));
          return response;
        })
        .catch(() => caches.match("./"))
    );
    return;
  }

  // Built files: serve from cache, fetch and cache anything new.
  event.respondWith(
    caches.match(request).then(
      (cached) =>
        cached ||
        fetch(request).then((response) => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(CACHE).then((cache) => cache.put(request, copy));
          }
          return response;
        })
    )
  );
});

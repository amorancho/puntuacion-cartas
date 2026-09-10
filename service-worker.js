const CACHE_PREFIX = "puntuacion-cartas-";
const CACHE_NAME = `${CACHE_PREFIX}v2`;
const APP_SHELL = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./dist/css/styles.css",
  "./src/js/app.js",
  "./src/js/storage.js",
  "./src/js/state.js",
  "./src/js/utils.js",
  "./src/js/games/index.js",
  "./src/js/games/pinacle.js",
  "./src/js/games/escoba.js",
  "./src/js/games/brisca.js",
  "./src/js/ui/components.js",
  "./src/js/ui/home.js",
  "./src/js/ui/setup.js",
  "./src/js/ui/game.js",
  "./assets/icons/card-score-192.png",
  "./assets/icons/card-score-512.png",
  "./assets/icons/card-score-maskable-512.png",
  "./assets/icons/card-score.svg",
  "./assets/icons/card-score-maskable.svg"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL.map((path) => new URL(path, self.registration.scope).href)))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME)
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  const requestUrl = new URL(event.request.url);
  if (requestUrl.origin !== self.location.origin || !requestUrl.href.startsWith(self.registration.scope)) return;

  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
          return response;
        })
        .catch(() => caches.match(event.request).then((response) => response || caches.match(new URL("./index.html", self.registration.scope).href)))
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((response) => {
        if (!response || response.status !== 200) return response;
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        return response;
      });
    })
  );
});

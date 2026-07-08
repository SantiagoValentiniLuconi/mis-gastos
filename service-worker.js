const CACHE_NAME = "gastos-app-v15";
const ASSETS = [
  "./",
  "./index.html",
  "./index.html?v=15",
  "./styles.css?v=15",
  "./app.js?v=15",
  "./manifest.webmanifest",
  "./icon-192.png",
  "./icon-512.png",
  "./brand-logo.jpg",
  "./splash-screen.jpg",
];

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS)));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((names) => Promise.all(names.filter((name) => name !== CACHE_NAME).map((name) => caches.delete(name))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put("./index.html", copy));
          return response;
        })
        .catch(() => caches.match("./index.html?v=15").then((cached) => cached || caches.match("./index.html")))
    );
    return;
  }

  event.respondWith(caches.match(event.request).then((cached) => cached || fetch(event.request)));
});

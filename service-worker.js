const CACHE_NAME = "gastos-app-v6";
const ASSETS = ["./", "./index.html", "./styles.css?v=6", "./app.js?v=6", "./manifest.webmanifest"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS)));
});

self.addEventListener("fetch", (event) => {
  event.respondWith(caches.match(event.request).then((cached) => cached || fetch(event.request)));
});

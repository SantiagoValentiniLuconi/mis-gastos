const CACHE_NAME = "gastos-app-v11";
const ASSETS = [
  "./",
  "./index.html",
  "./styles.css?v=11",
  "./app.js?v=11",
  "./manifest.webmanifest",
  "./icon-192.png",
  "./icon-512.png",
  "./brand-logo.jpg",
  "./splash-screen.jpg",
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS)));
});

self.addEventListener("fetch", (event) => {
  event.respondWith(caches.match(event.request).then((cached) => cached || fetch(event.request)));
});

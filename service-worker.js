/* ============================================================
   MI DIARIO CUTE — SERVICE WORKER
   ============================================================
   Cachea el "shell" de la app (HTML, manifest, íconos) para que
   abra sin conexión. Tus entradas del diario NO viven aquí:
   se guardan en IndexedDB, dentro del navegador, en este mismo
   origen (dominio) donde alojes la app.
   ============================================================ */

const CACHE_VERSION = "mi-diario-cute-v4";

const APP_SHELL = [
  "./",
  "./index.html",
  "./manifest.json",
  "./favicon.ico",
  "./assets/icon-180.png",
  "./assets/icon-192.png",
  "./assets/icon-192-maskable.png",
  "./assets/icon-512.png",
  "./assets/icon-512-maskable.png"
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
      Promise.all(
        keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const req = event.request;

  // Solo manejamos peticiones GET
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  const isSameOrigin = url.origin === self.location.origin;

  if (isSameOrigin) {
    // App shell: cache-first, con actualización en segundo plano
    event.respondWith(
      caches.match(req).then((cached) => {
        const fetchPromise = fetch(req)
          .then((networkRes) => {
            if (networkRes && networkRes.ok) {
              const clone = networkRes.clone();
              caches.open(CACHE_VERSION).then((cache) => cache.put(req, clone));
            }
            return networkRes;
          })
          .catch(() => cached);
        return cached || fetchPromise;
      })
    );
  } else {
    // Recursos externos (fuentes, íconos de Unicons): network-first,
    // con caída a caché si no hay conexión.
    event.respondWith(
      fetch(req)
        .then((networkRes) => {
          const clone = networkRes.clone();
          caches.open(CACHE_VERSION).then((cache) => cache.put(req, clone));
          return networkRes;
        })
        .catch(() => caches.match(req))
    );
  }
});

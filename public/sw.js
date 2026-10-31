const CACHE = "masjid-cache-v10";
const PRECACHE = [
  "/",
  "/tv",
  "/jadwal-shalat",
  "/jadwal-imam",
  "/kiblat",
  "/offline.html",
  "/favicon.ico",
  "/favicon-32x32.png",
  "/logo-masjid.png",
  "/logo-masjid-solid.png",
  "/icon-192.png",
  "/icon-512.png",
  "/icon-192-maskable.png",
  "/icon-512-maskable.png",
  "/icon-admin-192.png",
  "/icon-admin-512.png",
  "/icon-admin-192-maskable.png",
  "/icon-admin-512-maskable.png",
  "/apple-touch-icon.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) =>
        Promise.all(PRECACHE.map((url) => cache.add(url).catch(() => null)))
      )
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key)))
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/")) return;

  // Manifests & App Icons must ALWAYS be fetched fresh from network to prevent stale PWA identity
  if (
    url.pathname.includes("manifest") ||
    url.pathname.includes("favicon") ||
    url.pathname.includes("icon-") ||
    url.pathname.includes("logo-masjid")
  ) {
    event.respondWith(
      fetch(request)
        .then((res) => {
          if (res.ok) {
            const clone = res.clone();
            caches.open(CACHE).then((cache) => cache.put(request, clone));
          }
          return res;
        })
        .catch(() => caches.match(request))
    );
    return;
  }

  const isPrivate =
    url.pathname.startsWith("/admin") || url.pathname.startsWith("/auth");

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (!isPrivate) {
            const copy = response.clone();
            caches.open(CACHE).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(async () => {
          if (!isPrivate) {
            const cached = await caches.match(request);
            if (cached) return cached;
          }
          const offline = await caches.match("/offline.html");
          return (
            offline ||
            new Response("Offline", {
              status: 503,
              headers: { "Content-Type": "text/plain" },
            })
          );
        })
    );
    return;
  }

  if (isPrivate) return;

  event.respondWith(
    caches.match(request).then((cached) => {
      const network = fetch(request)
        .then((response) => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(CACHE).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(
          () =>
            cached ||
            new Response("Offline", {
              status: 503,
              headers: { "Content-Type": "text/plain" },
            })
        );
      return cached || network;
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const targetUrl = new URL(
    (event.notification.data && event.notification.data.url) || "/",
    self.location.origin
  ).href;

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        // Fokuskan tab aplikasi yang sudah terbuka, lalu arahkan ke URL
        // notifikasi (mis. halaman adzan/iqamah).
        const client = clientList.find((c) => c.url.startsWith(self.location.origin));
        if (client) {
          return client.focus().then((focused) => {
            if (focused && "navigate" in focused) {
              return focused.navigate(targetUrl).catch(() => focused);
            }
            return focused;
          });
        }
        return self.clients.openWindow(targetUrl);
      })
  );
});

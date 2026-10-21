// Offline support: always try the network first so updates show up at once; fall back to the cache offline.
const CACHE = "sointuseuraaja-v2";
const FILES = ["./", "index.html", "manifest.webmanifest", "icon.svg", "icon-192.png", "icon-512.png"];
self.addEventListener("install", (e) => { e.waitUntil(caches.open(CACHE).then((c) => c.addAll(FILES))); self.skipWaiting(); });
self.addEventListener("activate", (e) => { e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k))))); self.clients.claim(); });
self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET" || new URL(e.request.url).origin !== location.origin) return;
  e.respondWith(caches.open(CACHE).then((c) =>
    fetch(e.request, { cache: "no-cache" })
      .then((r) => { if (r.ok) c.put(e.request, r.clone()); return r; })
      .catch(() => c.match(e.request))
  ));
});

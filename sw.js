// Jimit Pet LLP — Service Worker
// 👉 Har naye update par sirf neeche VERSION badlo (e.g. v1.0.1), phir GitHub par upload karo.
// Sab phones/PC par apne aap naya version aa jayega aur "🔄 Naya version aaya hai — Reload" dikhega.
const VERSION = "v1.1.0-moulding";
const CACHE = "jpl-" + VERSION;
const CORE = ["./", "./index.html", "./manifest.json", "./icon-192.png", "./icon-180.png"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(CORE)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k.startsWith("jpl-") && k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", e => {
  const r = e.request;
  if (r.method !== "GET") return;
  const u = new URL(r.url);
  const isPage = r.mode === "navigate" || u.pathname.endsWith("/index.html") || u.pathname.endsWith("/");
  if (isPage && u.origin === location.origin) {
    // App page: pehle internet se (naya version), net na ho to cache se (offline chalega)
    e.respondWith(
      fetch(r).then(res => { const cp = res.clone(); caches.open(CACHE).then(c => c.put(r, cp)); return res; })
        .catch(() => caches.match(r).then(m => m || caches.match("./index.html")))
    );
    return;
  }
  // Baaki (libraries, icons): cache first
  e.respondWith(
    caches.match(r).then(m => m || fetch(r).then(res => {
      if (res && (res.status === 200 || res.type === "opaque")) { const cp = res.clone(); caches.open(CACHE).then(c => c.put(r, cp)); }
      return res;
    }).catch(() => m))
  );
});

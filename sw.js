// Jimit Pet LLP — Service Worker
// 👉 Har naye update par sirf neeche VERSION badlo (e.g. v1.0.1), phir GitHub par upload karo.
// Sab phones/PC par apne aap naya version aa jayega aur "🔄 Naya version aaya hai — Reload" dikhega.
const VERSION = "v1.13.1-libs-cache";
const CACHE = "jpl-" + VERSION;
// ✅ Bahari libraries (PDF reader, Excel, charts...) ka alag cache — VERSION badalne par ye DELETE NAHI hota,
//    taaki har update par library dobara download na karni pade (aur kharab net par bhi chalti rahe).
const LIBS_CACHE = "jpl-libs";
const CDN_OK = ["cdnjs.cloudflare.com", "cdn.jsdelivr.net"];
const CORE = ["./", "./index.html", "./manifest.json", "./icon-192.png", "./icon-180.png"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(CORE)).then(() => self.skipWaiting()));
});

// Purane version ke cache me jo CDN libraries thi unhe libs cache me bacha lo, phir purane cache hatao
async function migrateLibs() {
  const keys = await caches.keys();
  const libs = await caches.open(LIBS_CACHE);
  for (const k of keys) {
    if (!k.startsWith("jpl-") || k === CACHE || k === LIBS_CACHE) continue;
    const c = await caches.open(k);
    const reqs = await c.keys();
    for (const r of reqs) {
      let host = "";
      try { host = new URL(r.url).hostname; } catch (e) {}
      if (CDN_OK.includes(host) && !(await libs.match(r))) {
        const res = await c.match(r);
        if (res) await libs.put(r, res);
      }
    }
  }
}

self.addEventListener("activate", e => {
  e.waitUntil(
    migrateLibs().catch(() => {})
      .then(() => caches.keys())
      .then(keys => Promise.all(keys.filter(k => k.startsWith("jpl-") && k !== CACHE && k !== LIBS_CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", e => {
  const r = e.request;
  if (r.method !== "GET") return;
  const u = new URL(r.url);
  // ⚠️ Supabase (live data) aur baaki bahari sites ko KABHI cache mat karo — seedha internet se.
  // Sirf same-origin files aur 2 library CDN cache hote hain.
  if (u.origin !== location.origin && !CDN_OK.includes(u.hostname)) return;
  const isPage = r.mode === "navigate" || u.pathname.endsWith("/index.html") || u.pathname.endsWith("/");
  if (isPage && u.origin === location.origin) {
    // App page: pehle internet se (naya version), net na ho to cache se (offline chalega)
    e.respondWith(
      fetch(r).then(res => { const cp = res.clone(); caches.open(CACHE).then(c => c.put(r, cp)); return res; })
        .catch(() => caches.match(r).then(m => m || caches.match("./index.html")))
    );
    return;
  }
  // Bahari libraries: pehle libs cache se (version badalne par bhi bachi rehti hain), nahi mili to internet se aur wahi save
  if (u.origin !== location.origin) {
    e.respondWith(
      caches.open(LIBS_CACHE).then(lc => lc.match(r).then(m => m || fetch(r).then(res => {
        if (res && (res.status === 200 || res.type === "opaque")) { const cp = res.clone(); lc.put(r, cp); }
        return res;
      })))
    );
    return;
  }
  // Baaki (icons etc.): cache first
  e.respondWith(
    caches.match(r).then(m => m || fetch(r).then(res => {
      if (res && (res.status === 200 || res.type === "opaque")) { const cp = res.clone(); caches.open(CACHE).then(c => c.put(r, cp)); }
      return res;
    }).catch(() => m))
  );
});

/* Jimit Pet LLP — service worker
   Har baar index.html badalne par neeche ka SW_VERSION bhi badal dena, taaki sab device par naya version turant aaye. */
const SW_VERSION = "2026-11-27-store-rename-1";
const CACHE = "jpl-shell-" + SW_VERSION;
const SHELL = ["./", "index.html", "manifest.json"];
const CDN_HOSTS = ["cdnjs.cloudflare.com", "cdn.jsdelivr.net"];

self.addEventListener("install", function (e) {
  e.waitUntil((async function () {
    const c = await caches.open(CACHE);
    await Promise.all(SHELL.map(function (u) {
      return c.add(new Request(u, { cache: "reload" })).catch(function () {});
    }));
    await self.skipWaiting();
  })());
});

self.addEventListener("activate", function (e) {
  e.waitUntil((async function () {
    const keys = await caches.keys();
    await Promise.all(keys.filter(function (k) { return k.indexOf("jpl-shell-") === 0 && k !== CACHE; })
      .map(function (k) { return caches.delete(k); }));
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", function (e) {
  const r = e.request;
  if (r.method !== "GET") return;
  const u = new URL(r.url);

  // Dusri sites: sirf CDN ki libraries cache hongi. Supabase / API calls ko haath nahi lagate.
  if (u.origin !== self.location.origin) {
    if (CDN_HOSTS.indexOf(u.hostname) < 0) return;
    e.respondWith((async function () {
      const c = await caches.open(CACHE);
      const hit = await c.match(r);
      if (hit) return hit;
      try {
        const res = await fetch(r);
        if (res && (res.ok || res.type === "opaque")) c.put(r, res.clone()).catch(function () {});
        return res;
      } catch (err) { return hit || Response.error(); }
    })());
    return;
  }

  // App page: pehle network (naya version turant mile), net na ho to cache se (offline chalega)
  if (r.mode === "navigate" || u.pathname.slice(-1) === "/" || u.pathname.slice(-10) === "index.html") {
    e.respondWith((async function () {
      const c = await caches.open(CACHE);
      try {
        const res = await fetch(r, { cache: "no-store" });
        if (res && res.ok) c.put("index.html", res.clone()).catch(function () {});
        return res;
      } catch (err) {
        return (await c.match(r)) || (await c.match("index.html")) || (await c.match("./")) || Response.error();
      }
    })());
    return;
  }

  // Baaki apni files (manifest, icons): cache pehle, nahi mila to network
  e.respondWith((async function () {
    const c = await caches.open(CACHE);
    const hit = await c.match(r);
    if (hit) return hit;
    try {
      const res = await fetch(r);
      if (res && res.ok) c.put(r, res.clone()).catch(function () {});
      return res;
    } catch (err) { return hit || Response.error(); }
  })());
});

// Jimit Pet LLP — Service Worker  (v21 · 28-Nov-2026)
// Har naye release me CACHE ka naam badlo, tabhi sab devices par update aata hai.
const CACHE = 'jpl-pwa-v21-20261128';
const CORE = ['./', 'index.html', 'manifest.json', 'icon-192.png', 'icon-180.png'];
const CDN_HOSTS = ['cdnjs.cloudflare.com', 'cdn.jsdelivr.net', 'fonts.googleapis.com', 'fonts.gstatic.com'];

self.addEventListener('install', function (e) {
  e.waitUntil(
    caches.open(CACHE)
      .then(function (c) { return Promise.all(CORE.map(function (u) { return c.add(u).catch(function () {}); })); })
      .then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys()
      .then(function (ks) { return Promise.all(ks.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); })); })
      .then(function () { return self.clients.claim(); })
  );
});

// Apni site: pehle network (naya version), 4 sec me na aaye ya net na ho to cache (factory ka slow internet)
function networkFirst(req) {
  return new Promise(function (resolve) {
    var done = false;
    var timer = setTimeout(function () {
      caches.match(req, { ignoreSearch: true }).then(function (m) { if (m && !done) { done = true; resolve(m); } });
    }, 4000);
    fetch(req.url, { cache: 'no-cache', credentials: 'same-origin' }).then(function (res) {
      clearTimeout(timer);
      if (res && res.ok && res.type === 'basic') {
        var cp = res.clone();
        caches.open(CACHE).then(function (c) { c.put(req, cp); }).catch(function () {});
      }
      if (!done) { done = true; resolve(res); }
    }).catch(function () {
      clearTimeout(timer);
      caches.match(req, { ignoreSearch: true }).then(function (m) {
        if (done) return;
        done = true;
        if (m) return resolve(m);
        if (req.mode === 'navigate') return caches.match('index.html').then(function (h) { resolve(h || Response.error()); });
        resolve(Response.error());
      });
    });
  });
}

// CDN libraries (jsPDF, xlsx, Chart.js...): pehle cache, offline me bhi chalein
function cacheFirst(req) {
  return caches.match(req).then(function (m) {
    if (m) return m;
    return fetch(req).then(function (res) {
      if (res && (res.ok || res.type === 'opaque')) {
        var cp = res.clone();
        caches.open(CACHE).then(function (c) { c.put(req, cp); }).catch(function () {});
      }
      return res;
    });
  });
}

self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;
  var url;
  try { url = new URL(req.url); } catch (x) { return; }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return;
  if (url.origin === self.location.origin) { e.respondWith(networkFirst(req)); return; }
  if (CDN_HOSTS.indexOf(url.hostname) !== -1) { e.respondWith(cacheFirst(req)); return; }
  // baaki (Firebase / EmailJS / API) — seedha network, cache nahi
});

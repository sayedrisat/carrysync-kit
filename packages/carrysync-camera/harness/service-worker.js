/* Generated into sw.js with an exact content-versioned static resource list by build-offline.mjs.
 * Never stores events, device identity, requests from forms, camera frames or arbitrary responses.
 * No skipWaiting: an update activates when every old controlled page has closed.
 */
/* global __VERSION__, __FILES__ */
const scope = self.registration.scope;
const prefix = 'carrysync-camera-shell:' + new URL(scope).pathname + ':';
const cacheName = prefix + __VERSION__;
const entries = __FILES__;
const resources = entries.map(({ file }) => new URL(file, scope).href);
// Integrity prevents a deployment race/repair from mixing an old shell with new unhashed files.
const requests = entries.map(({ file, integrity }) => new Request(new URL(file, scope), { integrity, cache: 'reload', credentials: 'same-origin' }));
self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    try {
      const cache = await caches.open(cacheName);
      // addAll is atomic: a failed essential download must fail installation.
      await cache.addAll(requests);
    } catch (error) {
      await caches.delete(cacheName);
      throw error;
    }
  })());
});
self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    await Promise.all((await caches.keys()).filter((name) => name.startsWith(prefix) && name !== cacheName).map((name) => caches.delete(name)));
    await self.clients.claim();
  })());
});
self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  const root = new URL(scope);
  // Only these two document paths are app navigations. Query strings are never cache keys.
  const shell = request.mode === 'navigate' && url.origin === root.origin &&
    (url.pathname === root.pathname || url.pathname === root.pathname + 'index.html');
  const key = shell ? new URL('index.html', scope).href : url.href;
  if (!resources.includes(key)) return;
  event.respondWith((async () => (await (await caches.open(cacheName)).match(key)) || fetch(request))());
});
self.addEventListener('message', (event) => {
  if (event.data?.type !== 'CHECK_OFFLINE' || !event.ports[0]) return;
  event.waitUntil((async () => {
    let ready = false;
    try {
      const cache = await caches.open(cacheName);
      if (event.data.repair) {
        const missing = [];
        for (const request of requests) if (!(await cache.match(request.url))) missing.push(request);
        if (missing.length) await cache.addAll(missing);
      }
      ready = resources.includes(event.data.entry) && (await Promise.all(resources.map((url) => cache.match(url)))).every(Boolean);
    } catch { /* Cache Storage may be denied or evicted. */ }
    event.ports[0].postMessage({ ready });
  })());
});

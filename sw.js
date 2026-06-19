const CACHE_VERSION = 'catholic-way-V7-4-COVER-PRINCIPLE';
const ASSET_VERSION = 'V7-4-COVER-PRINCIPLE';
function withVersion(path) {
  return path + '?v=' + ASSET_VERSION;
}
const APP_SHELL = [
  './',
  './index.html',
  withVersion('./style.css'),
  withVersion('./css/module-common.css'),
  withVersion('./css/prayer.css'),
  withVersion('./css/web.css'),
  withVersion('./css/pilgrimage.css'),
  withVersion('./css/overlays.css'),
  withVersion('./css/cover-modals.css'),
  withVersion('./css/myfaith.css'),
  withVersion('./css/my-diocese.css'),
  withVersion('./js/myfaith.js'),
  withVersion('./app.js'),
  withVersion('./js/cover-common.js'),
  withVersion('./js/touch-ux.js'),
  withVersion('./js/prayer-ui.js'),
  withVersion('./js/cover-refresh.js'),
  withVersion('./js/app-state-guards.js'),
  withVersion('./web.js'),
  withVersion('./js/route-web-guards.js'),
  withVersion('./js/new-back-controller.js'),
  withVersion('./sw-update.js'),
  withVersion('./manifest.json'),
  withVersion('./icon-192x192.png'),
  withVersion('./icon-512x512.png'),
  withVersion('./icon-512x512-maskable.png'),
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION)
      .then((cache) => Promise.all(APP_SHELL.map((url) => cache.add(url).catch(() => null))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.map((key) => key === CACHE_VERSION ? null : caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

function sameOrigin(request) {
  try { return new URL(request.url).origin === self.location.origin; } catch (e) { return false; }
}
function isHtmlRequest(request) {
  return request.mode === 'navigate' || (request.headers.get('accept') || '').includes('text/html');
}
function isVersionedAsset(request) {
  try {
    const url = new URL(request.url);
    return url.searchParams.has('v') ||
      /parishes-[a-z-]+\.js|prayer-data\.js|prayer\.js|retreats\.js|shrines\.js|diocese\.html|diocese\.css|qa-firebase\.html|app\.js|style\.css|module-common\.css|prayer\.css|web\.css|pilgrimage\.css|overlays\.css|cover-modals\.css|myfaith\.css|my-diocese\.css|web\.js|touch-ux\.js|prayer-ui\.js|cover-refresh\.js|app-state-guards\.js|route-web-guards\.js|new-back-controller\.js|sw-update\.js/.test(url.pathname);
  } catch (e) { return false; }
}
async function networkFirst(request) {
  const cache = await caches.open(CACHE_VERSION);
  try {
    const fresh = await fetch(request, { cache: 'no-cache' });
    if (fresh && fresh.ok) cache.put(request, fresh.clone()).catch(() => null);
    return fresh;
  } catch (e) {
    const cached = await cache.match(request);
    return cached || cache.match('./index.html');
  }
}
async function cacheFirst(request) {
  const cache = await caches.open(CACHE_VERSION);
  const cached = await cache.match(request);
  if (cached) return cached;
  try {
    const fresh = await fetch(request);
    if (fresh && fresh.ok) cache.put(request, fresh.clone()).catch(() => null);
    return fresh;
  } catch (e) {
    return new Response('Offline', { status: 503 });
  }
}
async function staleWhileRevalidate(request) {
  const cache = await caches.open(CACHE_VERSION);
  const cached = await cache.match(request);
  const freshPromise = fetch(request)
    .then((fresh) => {
      if (fresh && fresh.ok) cache.put(request, fresh.clone()).catch(() => null);
      return fresh;
    })
    .catch(() => null);
  if (cached) return cached;
  const fresh = await freshPromise;
  return fresh || new Response('Offline', { status: 503 });
}
self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;
  if (!sameOrigin(request)) return;
  if (isHtmlRequest(request)) {
    event.respondWith(networkFirst(request));
    return;
  }
  if (isVersionedAsset(request)) {
    event.respondWith(cacheFirst(request));
    return;
  }
  event.respondWith(staleWhileRevalidate(request));
});

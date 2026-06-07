/* 가톨릭길동무 Service Worker — 성지순례 앱 V1
   구 catholic-way-V2-xxx 캐시를 자동 삭제하고 새 캐시로 전환합니다. */
'use strict';

const CACHE_VERSION = 'catholic-pilgrim-V3';

/* 앱 셸: 첫 실행에 필요한 파일 전부 선캐시 */
const APP_SHELL = [
  './',
  './index.html',
  './map.html?v=V3',
  './stamp.html',
  './prayer.html',
  './route.html',
  './app.js?v=V2',
  './shrines.js?v=V3',
  './courses.js?v=V1b',
  './routes.js?v=V2',
  './prayer.js?v=V1',
  './sw-update.js?v=V1',
  './manifest.json',
  './icon-192x192.png',
  './icon-512x512.png',
  './icon-512x512-maskable.png',
  './intro-cross-jesus.jpg?v=V2-113',
];

/* ── 설치: 앱 셸 선캐시 ── */
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION)
      .then((cache) => Promise.all(
        APP_SHELL.map((url) => cache.add(url).catch(() => null))
      ))
      .then(() => self.skipWaiting())
  );
});

/* ── 활성화: 구버전 캐시(catholic-way-V2-*) 전부 삭제 ── */
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.map((key) => key === CACHE_VERSION ? null : caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

/* ── 헬퍼 ── */
function sameOrigin(request) {
  try { return new URL(request.url).origin === self.location.origin; }
  catch (e) { return false; }
}
function isHtmlRequest(request) {
  return request.mode === 'navigate' ||
    (request.headers.get('accept') || '').includes('text/html');
}
function isVersionedAsset(request) {
  try {
    const url = new URL(request.url);
    /* ?v= 파라미터 있거나, 새 앱의 주요 JS/HTML 파일 */
    return url.searchParams.has('v') ||
      /app\.js|shrines\.js|courses\.js|routes\.js|prayer\.js|sw-update\.js|map\.html|stamp\.html|prayer\.html|route\.html/.test(url.pathname);
  } catch (e) { return false; }
}

/* ── 전략 ── */
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
  return cached || freshPromise;
}

/* ── fetch 인터셉트 ── */
self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;
  if (!sameOrigin(request)) return;          /* 외부(카카오맵SDK 등) 제외 */
  if (isHtmlRequest(request)) {
    event.respondWith(networkFirst(request)); /* HTML: 항상 최신 시도 */
    return;
  }
  if (isVersionedAsset(request)) {
    event.respondWith(cacheFirst(request));   /* 버전 자산: 캐시 우선 */
    return;
  }
  event.respondWith(staleWhileRevalidate(request)); /* 이미지 등: stale-while-revalidate */
});

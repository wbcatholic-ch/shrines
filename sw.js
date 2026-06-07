/* 가톨릭길동무 Service Worker
   BUILD 번호를 올릴 때마다 캐시가 완전히 갱신됩니다.
   HTML·JS → 항상 네트워크 우선 (즉시 반영)
   이미지  → 캐시 우선 (오프라인 지원) */
'use strict';

/* ★ 수정할 때마다 BUILD 번호만 올리면 됩니다 ★ */
const BUILD = 'B011';
const CACHE_VERSION = 'catholic-pilgrim-V3-' + BUILD;

const SHELL_STATIC = [
  './icon-192x192.png',
  './icon-512x512.png',
  './icon-512x512-maskable.png',
];

/* ── 설치: 정적 자산만 선캐시 (JS/HTML은 네트워크 우선이라 선캐시 불필요) ── */
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION)
      .then((cache) => Promise.all(
        SHELL_STATIC.map((url) => cache.add(url).catch(() => null))
      ))
      .then(() => self.skipWaiting())   /* 즉시 활성화 */
  );
});

/* ── 활성화: 구버전 캐시 전부 삭제 ── */
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.map((key) => key === CACHE_VERSION ? null : caches.delete(key))
      ))
      .then(() => self.clients.claim())  /* 즉시 모든 탭에 적용 */
  );
});

/* ── 전략 ── */
async function networkFirst(request) {
  const cache = await caches.open(CACHE_VERSION);
  try {
    const fresh = await fetch(request, { cache: 'no-store' });
    if (fresh && fresh.ok) cache.put(request, fresh.clone()).catch(() => null);
    return fresh;
  } catch (e) {
    const cached = await cache.match(request);
    return cached || new Response('Offline', { status: 503 });
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

function sameOrigin(request) {
  try { return new URL(request.url).origin === self.location.origin; }
  catch (e) { return false; }
}
function isStaticAsset(request) {
  return /\.(png|jpg|jpeg|gif|webp|svg|ico|woff2?|ttf)(\?|$)/.test(request.url);
}

/* ── fetch 인터셉트 ── */
self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;
  if (!sameOrigin(request)) return;     /* 외부 리소스(카카오맵 SDK 등) 제외 */

  if (isStaticAsset(request)) {
    event.respondWith(cacheFirst(request));    /* 이미지·폰트: 캐시 우선 */
  } else {
    event.respondWith(networkFirst(request)); /* HTML·JS·JSON: 항상 네트워크 우선 */
  }
});

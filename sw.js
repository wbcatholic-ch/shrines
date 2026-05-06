/* 클로드정리 Service Worker - 20260506-sec1
   캐시를 매번 삭제하지 않고, 버전 변경 시 오래된 캐시만 정리합니다.
   localStorage/사용자 설정은 건드리지 않습니다. */
const CACHE_VERSION = 'catholic-app-20260506-sec1';
const APP_SHELL = [
  './',
  './index.html',
  './diocese.html',
  './qa-firebase.html',
  './parishes.js',
  './config.js',       // API 키 설정 파일 — 오프라인 시에도 지도 동작에 필요
  './style.css',       // 3단계 파일 분리: 인라인 CSS → 외부 파일
  './app.js',          // 핵심 앱 로직 (지도·마커·탭·경로)
  './web.js',          // 가톨릭 웹사이트 목록 모듈
  './prayer.js',       // 기도문 모듈
  './patches.js',      // 뒤로가기·스와이프·터치 UX 패치
  './sw-update.js',    // 서비스워커 캐시 버전 관리
  './manifest.json',
  './icon-192x192.png'
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
async function staleWhileRevalidate(request) {
  const cache = await caches.open(CACHE_VERSION);
  const cached = await cache.match(request);
  const freshPromise = fetch(request)
    .then((fresh) => {
      if (fresh && fresh.ok) cache.put(request, fresh.clone()).catch(() => null);
      return fresh;
    })
    .catch(() => null);
  return cached || freshPromise || fetch(request);
}
self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;
  if (!sameOrigin(request)) return;
  if (isHtmlRequest(request)) {
    event.respondWith(networkFirst(request));
    return;
  }
  event.respondWith(staleWhileRevalidate(request));
});

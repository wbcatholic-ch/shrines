// no-cache/service-worker cleanup file
self.addEventListener('install', function(event){ self.skipWaiting(); });
self.addEventListener('activate', function(event){
  event.waitUntil(
    caches.keys().then(function(keys){ return Promise.all(keys.map(function(k){ return caches.delete(k); })); })
    .then(function(){ return self.registration.unregister(); })
  );
});
self.addEventListener('fetch', function(event){
  event.respondWith(fetch(event.request, {cache:'no-store'}));
});

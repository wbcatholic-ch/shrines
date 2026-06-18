importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey:            'AIzaSyCGUwhWXTgc09ghEtOcvinpQKrr577zAhM',
  authDomain:        'catholic-6c7d8.firebaseapp.com',
  projectId:         'catholic-6c7d8',
  storageBucket:     'catholic-6c7d8.firebasestorage.app',
  messagingSenderId: '952327785327',
  appId:             '1:952327785327:web:1576bc6d678ba42f8a369a'
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage(function(payload) {
  const notification = payload && payload.notification ? payload.notification : {};
  const data = payload && payload.data ? payload.data : {};
  const title = notification.title || '가톨릭길동무 새 문의';
  const options = {
    body: notification.body || '새 문의·건의가 접수되었습니다.',
    icon: './icon-192x192.png',
    badge: './icon-192x192.png',
    data: data
  };
  self.registration.showNotification(title, options);
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  event.waitUntil(clients.openWindow('./admin-notify.html'));
});

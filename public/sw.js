// Service Worker para notificações persistentes e gerenciamento de cache
const CACHE_NAME = 'barbearia-v3';
const SW_DEBUG =
  self.location.hostname === 'localhost' ||
  self.location.hostname === '127.0.0.1';

const debugLog = (...args) => {
  if (SW_DEBUG) {
    console.log(...args);
  }
};

debugLog('🔧 Service Worker: Loading...');

// Lista de assets para cache (será preenchida pelo VitePWA em produção)
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.ico',
  '/icon-192.png',
  '/icon-512.png'
];

self.addEventListener('install', (event) => {
  debugLog('✅ Service Worker: Installing...');
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  debugLog('✅ Service Worker: Activating...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            debugLog('🗑️ Service Worker: Deleting old cache', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => clients.claim())
  );
});

// Estratégia Stale-While-Revalidate para assets estáticos
self.addEventListener('fetch', (event) => {
  // Ignorar requisições de API (Supabase) para não causar problemas com dados em tempo real
  if (event.request.url.includes('supabase.co')) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        // Retorna o cache mas busca atualização em background
        fetch(event.request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, networkResponse));
          }
        }).catch(() => {});
        return cachedResponse;
      }
      return fetch(event.request);
    })
  );
});

// Lidar com mensagens do cliente (Notificações)
self.addEventListener('message', (event) => {
  debugLog('📨 Service Worker: Message received', event.data);
  
  if (event.data.type === 'SHOW_NOTIFICATION') {
    const { title, options } = event.data;
    
    self.registration.showNotification(title, {
      ...options,
      badge: '/icon-192.png',
      icon: '/icon-192.png',
      requireInteraction: true,
      silent: false,
      vibrate: [200, 100, 200],
      tag: 'appointment-notification',
      renotify: true,
    });
  }
  
  if (event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Lidar com cliques em notificações
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes('/barbeiro') && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow('/barbeiro');
      }
    })
  );
});

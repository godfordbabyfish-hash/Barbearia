// Service Worker para notificações persistentes
const CACHE_NAME = 'barbearia-v2';

console.log('🔧 Service Worker: Loading...');

self.addEventListener('install', (event) => {
  console.log('✅ Service Worker: Installed');
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('✅ Service Worker: Activated');
  event.waitUntil(clients.claim());
});

// Manter o service worker ativo
self.addEventListener('fetch', (event) => {
  // Não interceptar requests, apenas manter o SW ativo
  event.respondWith(fetch(event.request).catch(() => new Response('Offline')));
});

// Lidar com mensagens do cliente
self.addEventListener('message', (event) => {
  console.log('📨 Service Worker: Message received', event.data);
  
  if (event.data.type === 'SHOW_NOTIFICATION') {
    console.log('📢 Service Worker: Showing notification via message');
    const { title, options } = event.data;
    
    self.registration.showNotification(title, {
      ...options,
      badge: '/favicon.ico',
      icon: '/favicon.ico',
      requireInteraction: true,
      silent: false,
      vibrate: [200, 100, 200],
      tag: 'appointment-notification',
      renotify: true,
    }).then(() => {
      console.log('✅ Service Worker: Notification shown successfully');
    }).catch((error) => {
      console.error('❌ Service Worker: Error showing notification:', error);
    });
  }
  
  if (event.data.type === 'KEEP_ALIVE') {
    // Responder para manter a conexão viva
    event.ports[0].postMessage({ status: 'alive' });
  }
});

// Lidar com cliques em notificações
self.addEventListener('notificationclick', (event) => {
  console.log('👆 Notification clicked:', event.notification.tag);
  event.notification.close();
  
  // Abrir ou focar na janela do app
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Se já houver uma janela aberta, focar nela
      for (const client of clientList) {
        if (client.url.includes('/barbeiro') && 'focus' in client) {
          return client.focus();
        }
      }
      // Senão, abrir nova janela
      if (clients.openWindow) {
        return clients.openWindow('/barbeiro');
      }
    })
  );
});

// Manter o service worker ativo com periodic sync se disponível
if ('periodicSync' in self.registration) {
  self.addEventListener('periodicsync', (event) => {
    if (event.tag === 'keep-alive') {
      console.log('⏰ Periodic sync: keep-alive');
    }
  });
}

console.log('✅ Service Worker: Fully loaded and ready');

const CACHE_NAME = 'hotel-pwa-cache-v2';

const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/LogoHotel.png',
  '/hotel_lobby_bg.jpg',
  '/favicon.svg'
];

self.addEventListener('install', (event) => {
  // Activar inmediatamente el nuevo Service Worker sin esperar a que se cierren las pestañas
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch((err) => console.log('PWA cache error:', err));
    })
  );
});

self.addEventListener('activate', (event) => {
  // Limpiar cachés antiguas y tomar control inmediato de todos los clientes
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log('Eliminando cache antigua:', key);
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  // 1. Ignorar completamente peticiones a la API para que siempre consulten datos en tiempo real
  if (event.request.url.includes('/api/')) {
    return;
  }

  // 2. Estrategia NETWORK-FIRST para toda la aplicación web:
  // Siempre ir a la red primero para obtener la versión más reciente compilada en el servidor.
  // Solo usar la caché si el servidor no responde o estamos sin conexión.
  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        if (
          networkResponse &&
          networkResponse.status === 200 &&
          networkResponse.type === 'basic'
        ) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      })
      .catch(() => {
        // Fallback offline a la caché
        return caches.match(event.request).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          if (event.request.mode === 'navigate') {
            return caches.match('/index.html');
          }
          return null;
        });
      })
  );
});

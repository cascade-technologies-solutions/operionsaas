// Service Worker for Operion PWA
const CACHE_VERSION = 'v1.1.0'; // Bumped to force service worker update (API requests bypass fix)
const STATIC_CACHE = `operion-static-${CACHE_VERSION}`;
const DYNAMIC_CACHE = `operion-dynamic-${CACHE_VERSION}`;
const API_CACHE = `operion-api-${CACHE_VERSION}`;

// Listen for messages from the page to force skip waiting
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    console.log('Received SKIP_WAITING message, forcing activation');
    self.skipWaiting();
  }
});

// Static assets to cache on install
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.ico',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png'
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('Service Worker installing...');
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      console.log('Caching static assets');
      return cache.addAll(STATIC_ASSETS);
    }).then(() => {
      console.log('API cache ready');
      return caches.open(API_CACHE);
    }).then(() => {
      return self.skipWaiting();
    })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('Service Worker activating...');
  event.waitUntil(
    Promise.all([
      // Clean up old caches
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (![STATIC_CACHE, DYNAMIC_CACHE, API_CACHE].includes(cacheName)) {
              console.log('Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      }),
      // Take control of all clients immediately
      self.clients.claim()
    ]).then(() => {
      // Notify all clients that the new service worker is active
      return self.clients.matchAll().then((clients) => {
        clients.forEach((client) => {
          client.postMessage({ type: 'SW_ACTIVATED', version: CACHE_VERSION });
        });
      });
    })
  );
});

// Fetch event - handle different caching strategies
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const bypassReason = getBypassReason(request);

  // Ensure CORS-sensitive requests bypass the service worker entirely
  if (bypassReason) {
    logBypass(bypassReason, request);
    return;
  }

  // Handle different types of requests for non-API resources only
  if (request.method === 'GET') {
    // Static assets - Cache First strategy
    if (isStaticAsset(request)) {
      event.respondWith(cacheFirst(request, STATIC_CACHE));
      return;
    }

    // HTML/navigation requests - Network First with fallback to cache
    if (request.mode === 'navigate') {
      event.respondWith(staleWhileRevalidate(request, DYNAMIC_CACHE));
      return;
    }

    // Other GET requests - Stale While Revalidate
    event.respondWith(staleWhileRevalidate(request, DYNAMIC_CACHE));
    return;
  }
});

// Cache First strategy for static assets
async function cacheFirst(request, cacheName) {
  try {
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(cacheName);
      // Clone the response before caching
      await cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    console.error('Cache first failed:', error);
    return new Response('Offline - Resource not available', { status: 503 });
  }
}

// Network First strategy for API requests
async function networkFirst(request, cacheName) {
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(cacheName);
      // Clone the response before caching
      await cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    console.log('Network failed, trying cache:', error);
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    return new Response('Offline - API not available', { status: 503 });
  }
}

// Stale While Revalidate strategy
async function staleWhileRevalidate(request, cacheName) {
  try {
    const cachedResponse = await caches.match(request);
    
    // Start the network request
    const networkPromise = fetch(request).catch(() => null);
    
    // If we have a cached response, return it immediately
    if (cachedResponse) {
      // Update cache in background
      networkPromise.then(networkResponse => {
        if (networkResponse && networkResponse.ok) {
          caches.open(cacheName).then(cache => {
            cache.put(request, networkResponse);
          });
        }
      });
      return cachedResponse;
    }
    
    // No cached response, wait for network
    const networkResponse = await networkPromise;
    if (networkResponse && networkResponse.ok) {
      // Cache the response
      const cache = await caches.open(cacheName);
      await cache.put(request, networkResponse.clone());
      return networkResponse;
    }
    
    // Network failed and no cache
    return new Response('Network error', { status: 503 });
  } catch (error) {
    console.error('Stale while revalidate failed:', error);
    return new Response('Service error', { status: 500 });
  }
}

// Check if request is for static asset
function isStaticAsset(request) {
  const url = new URL(request.url);
  return url.pathname.match(/\.(js|css|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot)$/);
}

function getBypassReason(request) {
  // Always bypass preflight requests to let the browser handle CORS
  if (request.method === 'OPTIONS') {
    return 'OPTIONS preflight';
  }

  // Only cache GET requests. All other methods bypass the service worker.
  if (request.method !== 'GET') {
    return `Non-GET request (${request.method})`;
  }

  const url = new URL(request.url);

  if (isAPIRequest(url)) {
    return 'API request';
  }

  // Bypass cross-origin requests that are likely API calls or credentialed fetches
  const isCrossOrigin = url.origin !== self.location.origin;
  if (isCrossOrigin && (request.credentials === 'include' || request.mode === 'cors')) {
    return 'Cross-origin CORS/credentialed request';
  }

  return null;
}

// Check if the URL targets an API endpoint (same-origin or cross-origin)
function isAPIRequest(url) {
  const pathname = url.pathname;
  const hostname = url.hostname.toLowerCase();

  if (pathname.startsWith('/api/')) {
    return true;
  }

  const apiHostPatterns = [
    'api.',
    'backend.',
    'staging-api.',
    'localhost',
    '127.0.0.1'
  ];

  if (apiHostPatterns.some((pattern) => hostname.includes(pattern))) {
    return true;
  }

  // Treat explicit API file extensions (like .json) without static file types as API
  if (!pathname.match(/\.(js|css|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot|html)$/) && hostname.includes('api')) {
    return true;
  }

  return false;
}

function logBypass(reason, request) {
  console.debug('[SW] Bypassing request to allow native CORS handling:', {
    reason,
    method: request.method,
    url: request.url
  });
}

// Background sync for offline data
self.addEventListener('sync', (event) => {
  if (event.tag === 'background-sync') {
    event.waitUntil(doBackgroundSync());
  }
});

async function doBackgroundSync() {
  // Handle background sync logic here
  console.log('Background sync triggered');
}

// Push notification handling
self.addEventListener('push', (event) => {
  if (event.data) {
    const data = event.data.json();
    const options = {
      body: data.body,
      icon: '/icons/icon-192x192.png',
      badge: '/icons/icon-192x192.png',
      vibrate: [100, 50, 100],
      data: {
        dateOfArrival: Date.now(),
        primaryKey: data.primaryKey
      },
      actions: [
        {
          action: 'explore',
          title: 'View Details',
          icon: '/icons/icon-192x192.png'
        },
        {
          action: 'close',
          title: 'Close',
          icon: '/icons/icon-192x192.png'
        }
      ]
    };
    
    event.waitUntil(
      self.registration.showNotification(data.title, options)
    );
  }
});

// Notification click handling
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  if (event.action === 'explore') {
    event.waitUntil(
      clients.openWindow('/')
    );
  }
});
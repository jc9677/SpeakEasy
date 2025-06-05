// Service Worker for SpeakEasy
// Enables offline functionality by caching app resources

const CACHE_NAME = 'speakeasy-v3';
const urlsToCache = [
  '/',
  '/index.html',
  '/assets/app.js',
  '/assets/styles.css',
  '/assets/icon.svg'
];

// Install event - cache resources
self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(function(cache) {
        console.log('SpeakEasy: Opened cache');
        // Cache core resources first
        return cache.addAll(urlsToCache);
      })
      .then(function(cache) {
        // Try to cache external resources separately (don't fail if they're unavailable)
        const externalResources = [
          'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap',
          'https://cdn.jsdelivr.net/npm/feather-icons@4.29.0/dist/feather.min.css'
        ];
        
        return Promise.allSettled(
          externalResources.map(url => 
            fetch(url).then(response => {
              if (response.ok) {
                return caches.open(CACHE_NAME).then(cache => cache.put(url, response));
              }
            }).catch(err => console.log('Failed to cache external resource:', url, err))
          )
        );
      })
      .then(function() {
        // Force the waiting service worker to become the active service worker
        return self.skipWaiting();
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', function(event) {
  event.waitUntil(
    caches.keys().then(function(cacheNames) {
      return Promise.all(
        cacheNames.map(function(cacheName) {
          if (cacheName !== CACHE_NAME) {
            console.log('SpeakEasy: Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(function() {
      // Claim all clients immediately
      return self.clients.claim();
    })
  );
});

// Fetch event - serve from cache when offline
self.addEventListener('fetch', function(event) {
  // Only handle http(s) requests
  if (!event.request.url.startsWith('http')) {
    return;
  }
  event.respondWith(
    caches.match(event.request)
      .then(function(response) {
        // Return cached version or fetch from network
        if (response) {
          console.log('SpeakEasy: Serving from cache:', event.request.url);
          return response;
        }
        // If not in cache, fetch from network and cache it
        return fetch(event.request).then(function(response) {
          // Check if we received a valid response
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response;
          }
          // Clone the response for caching
          const responseToCache = response.clone();
          caches.open(CACHE_NAME)
            .then(function(cache) {
              cache.put(event.request, responseToCache);
            });
          return response;
        }).catch(function() {
          // If fetch fails and we're offline, try to serve a basic offline page
          if (event.request.destination === 'document') {
            return caches.match('/index.html');
          }
        });
      })
  );
});

// Listen for messages from the main thread
self.addEventListener('message', function(event) {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

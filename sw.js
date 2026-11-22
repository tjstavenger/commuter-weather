/**
 * Commuter Weather Service Worker
 * Provides offline caching for application assets and the most recent forecast data.
 */

const CACHE_NAME = 'commuter-weather-v3';
const STATIC_ASSETS = [
  './',
  './index.html',
  './css/app.css',
  './manifest.json',
  './favicon.ico',
  './images/favicon.png',
  './images/ride.png',
  './images/caution.png',
  './images/drive.png',
  './images/temp.svg',
  './images/wind.svg',
  './images/gust.svg',
  './images/precip.svg',
  './images/cloud.svg',
  './images/humidity.svg',
  './images/sun.svg',
  './images/windChill.svg',
  './images/visibility.svg',
  './js/app.js',
  './js/noaaClient.js',
  './js/decisionEngine.js',
  './js/solar.js',
  './js/locationService.js',
  './js/settingsService.js',
  './js/components/Header.js',
  './js/components/CommuteHero.js',
  './js/components/AlertBanner.js',
  './js/components/PeriodCard.js',
  './js/components/HourlyView.js',
  './js/components/OptionsModal.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn('Non-fatal error pre-caching assets in service worker:', err);
      });
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  // Only handle GET requests
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // Network-first strategy for NOAA weather and location APIs (with cache fallback)
  if (url.origin.includes('weather.gov') || url.origin.includes('zippopotam.us')) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // Cache-first strategy for static assets and CDN scripts
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((response) => {
        if (response.ok && (url.origin === self.location.origin || url.origin.includes('esm.sh'))) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      });
    })
  );
});

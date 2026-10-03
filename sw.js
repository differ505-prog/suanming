/**
 * Service Worker — 離線緩存
 * 策略：Cache-First（優先讀緩存，失敗再網路）
 */

const CACHE_NAME = 'suanming-v2';
const ASSETS = [
  '/',
  '/index.html',
  '/css/style.css',
  '/js/app.js',
  '/js/meihua.js',
  '/js/ziwei.js',
  '/js/sayings.js',
  '/js/card.js',
  '/js/storage.js',
  '/manifest.json'
];

// 安裝：緩存所有靜態資源
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return Promise.allSettled(
        ASSETS.map(url =>
          cache.add(url).catch(err => {
            console.warn('SW cache add failed for:', url, err);
          })
        )
      );
    }).then(() => self.skipWaiting())
  );
});

// 啟動：清理舊緩存
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(k => k !== CACHE_NAME)
          .map(k => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

// 請求攔截：Cache-First
self.addEventListener('fetch', e => {
  // 只處理同源 GET 請求
  if (e.request.method !== 'GET') return;
  if (!e.request.url.startsWith(self.location.origin)) return;

  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;

      return fetch(e.request).then(response => {
        // 不緩存非 200 回應
        if (!response || response.status !== 200 || response.type !== 'basic') {
          return response;
        }
        const clone = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(e.request, clone));
        return response;
      }).catch(() => {
        // 離線且無緩存，返回 index.html（單頁應用）
        if (e.request.mode === 'navigate') {
          return caches.match('/index.html');
        }
        return new Response('', { status: 503 });
      });
    })
  );
});

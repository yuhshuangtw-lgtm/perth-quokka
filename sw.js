// 離線快取：Brand Hwy、羅特尼斯島訊號差時仍能打開行程
const CACHE = 'per26-v1';
const CORE = ['./', './index.html', './manifest.webmanifest', './icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(CORE)));
  self.skipWaiting();
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))));
  self.clients.claim();
});

const put = (req, res) => { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); return res; };
const timeout = ms => new Promise((_, rej) => setTimeout(rej, ms));

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  const isFont = /fonts\.(googleapis|gstatic)\.com$/.test(url.host);
  if (url.origin !== location.origin && !isFont) return;
  if (isFont) {
    e.respondWith(caches.match(req).then(m => m || fetch(req).then(res => put(req, res))));
    return;
  }
  // 頁面：先試網路（3 秒內）拿最新行程，失敗就用快取
  e.respondWith(
    Promise.race([fetch(req), timeout(3000)])
      .then(res => put(req, res))
      .catch(() => caches.match(req, { ignoreSearch: true }).then(m => m || caches.match('./index.html')))
  );
});

/* ==========================================================================
   sw.js — 인터넷 없이도 앱이 열리게 해 주는 파일 (서비스 워커)
   앱을 고칠 때마다 아래 VERSION 숫자도 index.html의 APP_VERSION과 똑같이 올려 주세요.
   ========================================================================== */
const VERSION = '1.2.1';
const CACHE = 'our-days-' + VERSION;
const ASSETS = ['./', './index.html', './manifest.json', './icon-192.png', './icon-512.png', './icon-maskable-512.png'];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE)
      .then(cache => cache.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k.startsWith('our-days-') && k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // 화면(index.html): 인터넷이 되면 새 버전, 안 되면 저장해 둔 버전
  if (req.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        const res = await fetch(req);
        if (res.ok && res.type === 'basic' && !res.redirected) {
          const cache = await caches.open(CACHE);
          cache.put('./index.html', res.clone());
        }
        return res;
      } catch (err) {
        const cache = await caches.open(CACHE);
        return (await cache.match('./index.html')) || (await cache.match('./')) || Response.error();
      }
    })());
    return;
  }

  // 나머지 파일(아이콘 등): 저장해 둔 것 먼저
  event.respondWith((async () => {
    const hit = await caches.match(req);
    if (hit) return hit;
    const res = await fetch(req);
    if (res.ok && res.type === 'basic') {
      const cache = await caches.open(CACHE);
      cache.put(req, res.clone());
    }
    return res;
  })());
});

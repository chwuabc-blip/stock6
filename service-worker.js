const CACHE_NAME = 'winma-pro-v7.2.1';
const APP_SHELL = [
  './stock%207.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './apple-touch-icon.png'
];

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await cache.addAll(APP_SHELL);
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(key => key.startsWith('winma-pro-') && key !== CACHE_NAME).map(key => caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // 網頁本身採網路優先。只有 V7.2 主程式可更新主程式快取，
  // 其他獨立 HTML（例如 ch-calculator.html）絕不可覆寫 V7.2 快取。
  if (request.mode === 'navigate') {
    event.respondWith((async () => {
      const mainAppPath = new URL('./stock%207.html', self.registration.scope).pathname;
      try {
        const response = await fetch(request);
        if (response && response.ok && url.pathname === mainAppPath) {
          const cache = await caches.open(CACHE_NAME);
          await cache.put('./stock%207.html', response.clone());
        }
        return response;
      } catch (error) {
        if (url.pathname === mainAppPath) {
          return (await caches.match('./stock%207.html')) || Response.error();
        }
        return Response.error();
      }
    })());
    return;
  }

  // 同站靜態檔案採快取優先，缺少時再向網路取得。
  event.respondWith((async () => {
    const cached = await caches.match(request);
    if (cached) return cached;
    try {
      const response = await fetch(request);
      if (response && response.ok) {
        const cache = await caches.open(CACHE_NAME);
        await cache.put(request, response.clone());
      }
      return response;
    } catch (error) {
      return Response.error();
    }
  })());
});

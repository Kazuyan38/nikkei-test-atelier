/* Nikkei Atelier — offline support
 * HTML / data.js はネットワーク優先（更新を即反映し、圏外ならキャッシュ）。
 * 画像・マニフェストはキャッシュ優先。ファイル構成を変えたら VERSION を上げる。
 */
const VERSION = 'v1';
const CACHE = `nikkei-atelier-${VERSION}`;
const SHELL = [
  './', 'index.html', 'data.js', 'manifest.webmanifest',
  'icon-180.png', 'icon-192.png', 'icon-512.png', 'icon-maskable-512.png', 'favicon-32.png'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL.map(u => new Request(u, { cache: 'reload' })))).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k.startsWith('nikkei-atelier-') && k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

const networkFirst = async req => {
  const cache = await caches.open(CACHE);
  try {
    const res = await fetch(req, { cache: 'no-cache' });
    if (res.ok) cache.put(req, res.clone());
    return res;
  } catch (err) {
    const hit = await cache.match(req, { ignoreSearch: true })
      || (req.mode === 'navigate' && (await cache.match('./') || await cache.match('index.html')));
    if (hit) return hit;
    throw err;
  }
};

const cacheFirst = async req => {
  const hit = await caches.match(req, { ignoreSearch: true });
  if (hit) return hit;
  const res = await fetch(req);
  if (res.ok) (await caches.open(CACHE)).put(req, res.clone());
  return res;
};

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  const path = new URL(req.url).pathname;
  const fresh = req.mode === 'navigate' || /\/$|\.html$|data\.js$/.test(path);
  e.respondWith(fresh ? networkFirst(req) : cacheFirst(req));
});

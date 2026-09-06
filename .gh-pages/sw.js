// MindSpeak Service Worker — App 壳预缓存 + 网络优先/离线回退
// 版本号在构建时注入（见 build.js），每次发布强制刷新缓存
const CACHE = 'mindspeak-v20260905082342';
const APP_SHELL = [
  './',
  'index.html',
  'css/design-system.css',
  'css/icons.css',
  'css/style.css',
  'css/listening-fav.css',
  'css/wordlist.css',
  'css/items.css',
  'css/theme-fx.css',
  'css/dashboard.css',
  'css/nav.css',
  'css/ai-chat.css',
  'css/mobile.css',
  'js/bundle.js',
  'js/api-config.js',
  'js/head-boot.js',
  'assets/favicon.svg',
  'pwa-manifest.json'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => c.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  // Capacitor 环境跳过：origin 为 https://localhost 表示 Capacitor 打包环境
  if (location.origin === 'https://localhost' && location.protocol === 'https:') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;

  // 不缓存测试/动态接口
  if (url.pathname.startsWith('/api/')) return;
  if (url.pathname.includes('/sw.js')) return;

  // 应用壳和静态资源：优先走缓存（离线可用），后台更新缓存
  const isShell = (
    url.pathname.indexOf('/js/') >= 0 ||
    url.pathname.indexOf('/css/') >= 0 ||
    url.pathname.indexOf('/data/') >= 0 ||
    url.pathname.indexOf('/assets/') >= 0 ||
    url.pathname.endsWith('index.html') ||
    url.pathname.endsWith('manifest.json') ||
    url.pathname.endsWith('pwa-manifest.json') ||
    url.pathname === '/' ||
    url.pathname.endsWith('/')
  );

  e.respondWith(
    caches.match(req).then(cached => {
      const network = fetch(req)
        .then(res => {
          if (res && res.ok && (res.type === 'basic' || res.type === 'cors')) {
            const copy = res.clone();
            caches.open(CACHE).then(c => c.put(req, copy));
          }
          return res;
        })
        .catch(() => cached);
      // 静态资源：用缓存即时返回，网络结果仅在后台更新
      if (isShell && cached) return cached;
      return network;
    })
  );
});
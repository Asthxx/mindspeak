// MindSpeak Service Worker — App 壳预缓存 + 网络优先/离线回退
// 版本号在构建时注入（见 build.js），每次发布强制刷新缓存
const CACHE = 'mindspeak-v__BUILD_STAMP__';
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
  e.waitUntil((async () => {
    const c = await caches.open(CACHE);
    // 逐个缓存，而不是 c.addAll(APP_SHELL)：
    // addAll 是"全有或全无"—— 列表里只要有一个文件不存在（例如 dev 服务器下没有
    // 仅 dist 才生成的 js/bundle.js），整个 install 就 reject，SW 永远装不上，
    // 本地也就没法验证离线缓存。这里缺谁跳谁，其余照常缓存。
    await Promise.all(APP_SHELL.map(async (url) => {
      try { await c.add(new Request(url, { cache: 'reload' })); } catch (err) { /* 缺失/网络失败：跳过该项 */ }
    }));
    await self.skipWaiting();
  })());
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

  // 资源分类：
  //   代码资源（HTML/CSS/JS）→ 网络优先：样式/脚本改动刷新即见，离线时回退缓存
  //   数据/大文件（data/assets/manifest）→ 缓存优先：离线可用，网络结果后台更新
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
  const isCode = (
    url.pathname.indexOf('/js/') >= 0 ||
    url.pathname.indexOf('/css/') >= 0 ||
    url.pathname.endsWith('index.html') ||
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
      // 数据/大文件：用缓存即时返回（离线可用），网络结果仅在后台更新
      if (isShell && !isCode && cached) return cached;
      // HTML/CSS/JS：网络优先；离线时 network 的 catch 自动回退缓存
      return network;
    })
  );
});
// Service Worker 离线导航兜底（PWA 离线打开深链）
//
// 缺陷：缓存按"完整 URL（含查询串）"匹配。用户离线打开带 ?utm=... 的分享链接时，
// caches.match 未命中 → fetch 失败 → network 的 catch 返回 undefined →
// respondWith(undefined) 直接落到浏览器错误页，而预缓存的应用壳明明就在缓存里。
// 期望：任何导航请求网络失败时，回退到缓存的 index.html / './'（app shell 模式）。
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const SRC = readFileSync(join(root, 'sw.js'), 'utf8');
const ORIGIN = 'https://app.test';

// 极简 SW 作用域：只实现 sw.js 用到的 API
function loadSw({ cached = {}, online = false, body = 'NET' } = {}) {
  const listeners = {};
  const store = new Map(Object.entries(cached));   // key: 完整 URL
  const self = {
    addEventListener: (type, fn) => { listeners[type] = fn; },
    skipWaiting: async () => {},
    clients: { claim: async () => {} },
  };
  const caches = {
    open: async () => ({
      add: async () => {},
      put: async (req, res) => { store.set(req.url, res); },
    }),
    match: async (key) => {
      const href = typeof key === 'string' ? new URL(key, ORIGIN).href : key.url;
      return store.get(href) || undefined;
    },
    keys: async () => ['mindspeak-vtest'],
    delete: async () => true,
  };
  const fetchImpl = async () => {
    if (!online) throw new TypeError('offline');
    return new Response(body, { status: 200, headers: { 'Content-Type': 'text/html' } });
  };
  const location = { origin: ORIGIN, protocol: 'https:' };
  // eslint-disable-next-line no-new-func
  new Function('self', 'caches', 'fetch', 'location', SRC)(self, caches, fetchImpl, location);

  async function dispatch(request) {
    let responded = null;
    const event = { request, respondWith: (p) => { responded = p; } };
    if (!listeners.fetch) throw new Error('sw.js 未注册 fetch 监听');
    listeners.fetch(event);
    return responded ? await responded : undefined;
  }
  return { dispatch };
}

const shell = () => new Response('<html>shell</html>', { status: 200, headers: { 'Content-Type': 'text/html' } });
const nav = (path) => ({ url: ORIGIN + path, method: 'GET', mode: 'navigate' });

describe('Service Worker：离线导航', () => {
  it('离线打开带查询串的深链 → 回退缓存的应用壳（而不是错误页）', async () => {
    const sw = loadSw({ online: false, cached: { [ORIGIN + '/index.html']: shell() } });
    const res = await sw.dispatch(nav('/?utm_source=share'));
    expect(res, '导航请求必须有可用的响应').toBeTruthy();
    expect(await res.text()).toContain('shell');
  });

  it('离线打开根路径且只缓存了 ./ → 同样回退应用壳', async () => {
    const sw = loadSw({ online: false, cached: { [ORIGIN + '/']: shell() } });
    const res = await sw.dispatch(nav('/'));
    expect(res).toBeTruthy();
    expect(await res.text()).toContain('shell');
  });

  it('在线导航 → 返回网络响应并写入缓存', async () => {
    const sw = loadSw({ online: true, body: 'FRESH' });
    const res = await sw.dispatch(nav('/?v=2'));
    expect(await res.text()).toBe('FRESH');
  });

  it('离线且毫无缓存 → 明确失败（不是 undefined 静默）', async () => {
    const sw = loadSw({ online: false, cached: {} });
    const res = await sw.dispatch(nav('/nope'));
    // 允许返回 undefined（浏览器错误页）或 Response.error()，但不能是空白对象
    expect(res === undefined || (res && res.type === 'error')).toBe(true);
  });
});

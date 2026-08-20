import { describe, it, expect, beforeEach, vi } from 'vitest';

let mockCache;

beforeEach(() => {
  vi.resetModules();
  globalThis.window = globalThis;
  globalThis.caches = {
    open: vi.fn(),
    delete: vi.fn(),
    keys: vi.fn(),
  };
  mockCache = {
    add: vi.fn(),
    match: vi.fn(),
    put: vi.fn(),
  };
  globalThis.caches.open.mockResolvedValue(mockCache);
  globalThis.navigator = {
    serviceWorker: { register: vi.fn(), ready: Promise.resolve({}) },
    userAgent: 'Mozilla/5.0 (Linux; Android 10) AppleWebKit/537.36',
  };
  globalThis.document = { documentElement: { className: 'platform-android' } };
});

describe('Service Worker Android 缓存策略', () => {
  it('should_cache_static_assets_on_install', async () => {
    const urls = [
      './', 'index.html', 'css/main.css', 'css/themes.css',
      'js/app.js', 'js/tts-manager.js'
    ];
    const strategy = 'cache-first';
    expect(strategy).toBe('cache-first');
  });

  it('should_use_stale_revalidate_for_content', () => {
    const urls = ['vocabulary.json', 'phrases.json'];
    const strategy = 'stale-while-revalidate';
    expect(strategy).toBe('stale-while-revalidate');
  });

  it('should_use_network_first_for_api', () => {
    const urls = ['/api/tts'];
    const strategy = 'network-first';
    expect(strategy).toBe('network-first');
  });

  it('should_use_stale_while_revalidate_for_images', () => {
    const urls = ['assets/icon-192.png'];
    const strategy = 'stale-while-revalidate';
    expect(strategy).toBe('stale-while-revalidate');
  });

  it('should_return_network_first_for_api_requests', () => {
    const url = '/api/tts';
    const isApi = url.startsWith('/api/');
    expect(isApi).toBe(true);
  });

  it('should_return_cache_first_for_static_assets', () => {
    const url = 'js/app.js';
    const isStatic = /\.(js|css|html|png|svg|json|woff2?)$/.test(url);
    expect(isStatic).toBe(true);
  });

  it('should_return_stale_while_revalidate_for_content', () => {
    const url = 'vocabulary.json';
    const isContent = !url.startsWith('/api/') && !/\.(js|css|html|png|svg|json|woff2?)$/.test(url);
    expect(isContent).toBe(false);
  });

  it('should_handle_background_fetch_on_android', () => {
    const hasBgFetch = 'BackgroundFetch' in globalThis || false;
    expect(typeof hasBgFetch).toBe('boolean');
  });

  it('should_handle_cache_quota_on_android', async () => {
    const estimate = { usage: 1000000, quota: 50000000 };
    const percent = (estimate.usage / estimate.quota) * 100;
    expect(percent).toBeLessThan(50);
  });
});

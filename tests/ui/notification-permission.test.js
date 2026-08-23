import { describe, it, expect, beforeEach, vi } from 'vitest';
import { setupGlobals } from '../helpers/mocks.js';

// 通知权限只在"从未询问过"(prompt) 时请求一次：
// 每次冷启动都 requestPermissions() 会在用户拒绝过后反复弹系统授权框
// （Android 首次拒绝仍会再弹），清后台重开就被骚扰一次。

let ls;

function mockPlugin({ permState, hasCheck }) {
  const calls = { check: 0, request: 0 };
  const plugin = {};
  if (hasCheck !== false) {
    plugin.checkPermissions = vi.fn(() => {
      calls.check++;
      return Promise.resolve({ display: permState });
    });
  }
  plugin.requestPermissions = vi.fn(() => {
    calls.request++;
    return Promise.resolve({ display: permState === 'prompt' ? 'granted' : permState });
  });
  plugin.createChannel = vi.fn(() => Promise.resolve());
  globalThis.window.Capacitor = { isNative: true, Plugins: { LocalNotifications: plugin } };
  return { plugin, calls };
}

async function loadManager(permOpts) {
  ls = setupGlobals();
  ls._reset();
  globalThis.Logger = { log: vi.fn() };
  globalThis.window.App = { detectPlatform: () => 'android' };
  const mocks = mockPlugin(permOpts);
  vi.resetModules();
  await import('../../js/notification-manager.js');
  globalThis.window.NotificationManager.init();
  for (let i = 0; i < 8; i++) await Promise.resolve(); // 冲刷 promise 链
  return mocks;
}

describe('NotificationManager 权限询问时机', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('已授权(granted)：不再调用 requestPermissions', async () => {
    const { calls } = await loadManager({ permState: 'granted' });
    expect(calls.request).toBe(0);
  });

  it('曾拒绝(denied)：不自动再问，避免每次启动骚扰', async () => {
    const { calls } = await loadManager({ permState: 'denied' });
    expect(calls.request).toBe(0);
  });

  it('从未询问(prompt)：本次冷启动询问一次', async () => {
    const { calls } = await loadManager({ permState: 'prompt' });
    expect(calls.request).toBe(1);
  });

  it('旧插件无 checkPermissions：回退为直接请求（兼容）', async () => {
    const { calls } = await loadManager({ permState: 'prompt', hasCheck: false });
    expect(calls.request).toBe(1);
  });
});

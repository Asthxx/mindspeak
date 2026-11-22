// P2 加固回归网：预合成并发/队列上限、通知深链、每日计划脏数据、测评等待超时收敛
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { bootstrapApp } from '../helpers/app-bootstrap.js';

describe('朗读预合成（prefetch）不再无限堆积', () => {
  let S, origFetch, origInstant;
  beforeEach(async () => {
    vi.resetModules();
    await bootstrapApp();
    S = window.SpeechUtil;
    origFetch = window.fetch;
    origInstant = S.getSettings;
    S.getSettings = () => ({ instant: true, rate: 0.9, pitch: 1, voiceName: '' });
  });
  afterEach(() => { window.fetch = origFetch; S.getSettings = origInstant; });

  it('两次翻卡合并后并发仍 ≤2，队列长度有上限', async () => {
    const calls = [];
    let release;
    window.fetch = (url) => {
      calls.push(decodeURIComponent(String(url)));
      return new Promise((resolve) => { release = resolve; }); // 一直挂着，观察并发
    };
    const words = (n, tag) => Array.from({ length: n }, (_, i) => tag + i);
    S.prefetch(words(30, 'a'));
    S.prefetch(words(30, 'b'));
    expect(calls.length).toBe(2);              // 旧实现是每次调用各开 2 路 → 4 路
    expect(S._prefetchPool.length).toBeLessThanOrEqual(24);
    // 放行一个，应只补一个进来（并发仍为 2）
    release(new Response('', { status: 200 }));
    await new Promise((r) => setTimeout(r, 120));
    expect(calls.length).toBe(3);
    expect(S._prefetchPool.length).toBeLessThanOrEqual(24);
  });

  it('去重表不会无限增长（超过 800 项自动清空）', async () => {
    window.fetch = () => Promise.resolve(new Response('', { status: 200 }));
    S._prefetchSeen = {};
    for (let i = 0; i < 900; i++) S._prefetchSeen['w' + i] = 1;
    S.prefetch(['brand-new-word']);
    expect(Object.keys(S._prefetchSeen).length).toBeLessThan(50);
  });
});

describe('通知点击深链', () => {
  let listeners;
  beforeEach(async () => {
    vi.resetModules();
    listeners = {};
    await bootstrapApp();
    window.App = { detectPlatform: () => 'android' };
    window.Capacitor = {
      Plugins: {
        LocalNotifications: {
          checkPermissions: () => Promise.resolve({ display: 'granted' }),
          requestPermissions: () => Promise.resolve({ display: 'granted' }),
          createChannel: () => Promise.resolve(),
          addListener: (name, cb) => { listeners[name] = cb; return Promise.resolve({ remove() {} }); },
          schedule: () => Promise.resolve(),
          cancel: () => Promise.resolve(),
        }
      }
    };
  });
  afterEach(() => {
    delete window.Capacitor;
    window.App = { detectPlatform: () => 'web' };
  });

  it('init 时注册 localNotificationActionPerformed 监听', async () => {
    window.NotificationManager.init();
    await new Promise((r) => setTimeout(r, 0));
    expect(typeof listeners.localNotificationActionPerformed).toBe('function');
  });

  it('点击通知跳到 extra.module 对应页面（调用 app.showTab，而不是不存在的 App.switchTab）', async () => {
    window.NotificationManager.init();
    await new Promise((r) => setTimeout(r, 0));
    const seen = [];
    const orig = window.app.showTab;
    window.app.showTab = (t) => { seen.push(t); };
    try {
      listeners.localNotificationActionPerformed({ notification: { extra: { module: 'pomodoro' } } });
    } finally { window.app.showTab = orig; }
    expect(seen).toEqual(['pomodoro']);
  });

  it('extra 缺失/无 module 时静默忽略，不跳到空白页', async () => {
    const seen = [];
    const orig = window.app.showTab;
    window.app.showTab = (t) => { seen.push(t); };
    try {
      window.NotificationManager.handleNotificationData(null);
      window.NotificationManager.handleNotificationData({});
    } finally { window.app.showTab = orig; }
    expect(seen).toEqual([]);
  });
});

describe('每日计划：脏进度数据不会中断渲染', () => {
  beforeEach(async () => {
    vi.resetModules();
    await bootstrapApp();
  });

  it('word_progress 里出现 null 条目时 render 不抛错且跳过该条', () => {
    const progress = {
      'apple-0': { firstSeen: window.getLocalDateStr(), lastReviewed: '', status: 'learning', nextReview: '2999-01-01' },
      'book-0': null,
      'cat-0': 'not-an-object'
    };
    // render 优先读内存态（写入有节流），两边都放同一份脏数据
    window.DataStore.setProgress('word_progress', progress);
    window.app.wordModule.wordProgress = progress;
    const mod = window.app.dailyPlanModule;
    expect(mod).toBeTruthy();
    expect(() => mod.render()).not.toThrow();
    // 正常条目仍然计入（今日新学 1）
    expect(document.getElementById('dp-new').textContent).toBe('1');
  });
});

describe('测评：词库未就绪时用统一等待（可取消、不再无限自递归）', () => {
  beforeEach(async () => {
    vi.resetModules();
    await bootstrapApp();
  });

  it('词库缺失时进入等待态，close() 能取消等待', () => {
    const saved = globalThis.WORD_LIBRARY;
    globalThis.WORD_LIBRARY = undefined;   // 模拟 async 数据脚本还没落地
    window.WORD_LIBRARY = undefined;
    const mod = window.app.assessmentModule;
    try {
      mod.open();
      mod.start();
      expect(typeof mod._libWaitCancel).toBe('function');
      mod.close();
      expect(mod._libWaitCancel).toBe(null);
    } finally {
      globalThis.WORD_LIBRARY = saved;
      window.WORD_LIBRARY = saved;
    }
  });
});

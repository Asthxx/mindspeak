// 行为级测试：轻量 hash 路由 / 返回栈 / 深链（UI 审查 P1-7）
// 真实加载生产代码 + 真实 index.html DOM，用 bootstrapApp 驱动。
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { bootstrapApp } from '../helpers/app-bootstrap.js';

const sleep = ms => new Promise(r => setTimeout(r, ms));

describe('轻量 hash 路由（P1-7）', () => {
  beforeEach(async () => {
    vi.resetModules();
    await bootstrapApp();
  });

  afterEach(() => {
    window.location.hash = '';
  });

  it('showTab 把当前页写进 location.hash', () => {
    window.app.showTab('word');

    expect(window.location.hash, '切页没有写 hash，刷新/分享都会回到首页').toBe('#/word');
    expect(window.app.currentTab).toBe('word');
  });
});

describe('hash 反向驱动页面（P1-7）', () => {
  beforeEach(async () => {
    vi.resetModules();
    await bootstrapApp();
  });

  afterEach(() => {
    window.location.hash = '';
  });

  it('改动 hash 会切到对应页（浏览器前进/后退与地址栏生效）', async () => {
    window.app.showTab('home');
    expect(document.getElementById('page-home').classList.contains('active')).toBe(true);

    window.location.hash = '#/word';
    await sleep(80);

    expect(document.getElementById('page-word').classList.contains('active'), 'hash 变了但页面没跟着切').toBe(true);
    expect(window.app.currentTab).toBe('word');
  });

  it('hash 指向不存在的页时不切换，也不报错', async () => {
    window.app.showTab('home');

    window.location.hash = '#/not-a-real-page';
    await sleep(80);

    expect(window.app.currentTab, '未知 hash 把页面带偏了').toBe('home');
    expect(document.getElementById('page-home').classList.contains('active')).toBe(true);
  });
});

describe('深链启动（P1-7）', () => {
  afterEach(() => {
    window.location.hash = '';
  });

  it('带 hash 打开会直接进入对应页（链接可分享、刷新保持）', async () => {
    window.location.hash = '#/word';
    vi.resetModules();
    await bootstrapApp();

    expect(document.getElementById('page-word').classList.contains('active'), '深链没有直达目标页').toBe(true);
    expect(window.app.currentTab).toBe('word');
  });

  it('hash 为空时仍从首页开始', async () => {
    window.location.hash = '';
    vi.resetModules();
    await bootstrapApp();

    expect(window.app.currentTab).toBe('home');
    expect(document.getElementById('page-home').classList.contains('active')).toBe(true);
  });
});

describe('返回键返回栈（P1-7）', () => {
  beforeEach(async () => {
    vi.resetModules();
    await bootstrapApp();
  });

  afterEach(() => {
    window.location.hash = '';
  });

  it('非首页时按返回键回到首页，而不是提示退出', () => {
    window.app.showTab('word');

    const handled = window.app._onBackPressed();

    expect(handled, '返回键没被接管，用户会看到"再按一次退出"').toBe(true);
    expect(window.app.currentTab).toBe('home');
  });

  it('已经在首页时按返回键不接管（仍走双击退出）', () => {
    window.app.showTab('home');

    expect(window.app._onBackPressed()).toBe(false);
    expect(window.app.currentTab).toBe('home');
  });

  it('回首页后 hash 同步为 #/home', () => {
    window.app.showTab('word');
    window.app._onBackPressed();

    expect(window.location.hash).toBe('#/home');
  });
});

describe('抽屉占位回收与路由的相互干扰（真机踩过的 bug）', () => {
  beforeEach(async () => {
    vi.resetModules();
    await bootstrapApp();
  });

  afterEach(() => {
    window.location.hash = '';
  });

  it('抽屉占位在切页时被同步改写掉，不留悬空条目', () => {
    // 早期方案：先写 hash，再 history.back() 回收占位 —— 那次异步回退会把 hash
    // 拉回旧值，又被路由监听读成"用户切页"，真机上表现为"切过去 300ms 内被弹回来"。
    // 现在改成把占位条目**直接改写**成本页条目：同步完成，不需要等任何后续事件。
    //
    // 用自建元素而不是 #sidebar：jsdom 环境里该节点未必存在，
    // 拿不到节点会让整个分支被跳过，测试变成空跑。
    const backSpy = vi.spyOn(window.history, 'back').mockImplementation(function() {});
    window.app._drawerEls = { sidebar: document.createElement('div'), scrim: document.createElement('div') };
    window.history.pushState({ msDrawer: 1 }, '', '#/home');

    window.app.showTab('settings');

    expect(backSpy, '仍在靠 history.back() 回收占位').not.toHaveBeenCalled();
    expect(window.history.state.msDrawer, '占位没被清掉，会留下悬空条目').toBeUndefined();
    expect(window.history.state.msTab).toBe('settings');
    expect(window.location.hash, 'hash 没同步对齐（说明还得等某个事件）').toBe('#/settings');
    expect(document.querySelector('.page.active').id).toBe('page-settings');
    backSpy.mockRestore();
  });

  it('没有抽屉占位时立刻写 hash，不依赖任何后续事件', () => {
    window.app.showTab('word');
    expect(window.location.hash).toBe('#/word');
  });
});

describe('应用内前进/后退（P1-7 已知限制的收尾）', () => {
  beforeEach(async () => {
    vi.resetModules();
    await bootstrapApp();
  });

  afterEach(() => {
    window.location.hash = '';
  });

  it('切页压入历史条目，且条目带 msTab 标记', () => {
    // 原来一律 replaceState：浏览器后退会直接退出应用而不是回到上一页。
    const before = window.history.length;
    window.app.showTab('word');
    const after = window.history.length;
    expect(after, '切页没有压入历史条目').toBeGreaterThan(before);
    expect(window.history.state && window.history.state.msTab).toBe('word');
  });

  it('抽屉占位待回收时改为改写该条目，不再调用 history.back()', () => {
    // history.back() 是异步的，它落地的那一下会把 hash 拉回旧值，
    // 又会被路由监听读成"用户切页"（真机踩过的弹回 bug）。
    // 改成直接把那条抽屉条目改写成本页条目：同步、无竞态、不留悬空占位。
    const backSpy = vi.spyOn(window.history, 'back').mockImplementation(function() {});
    window.app._drawerEls = { sidebar: document.createElement('div') };
    window.history.pushState({ msDrawer: 1 }, '', '#/home');

    window.app.showTab('practice');

    expect(backSpy, '仍在靠 history.back() 回收抽屉占位').not.toHaveBeenCalled();
    expect(window.history.state.msDrawer, '抽屉占位没被清掉（会留下悬空条目）').toBeUndefined();
    expect(window.history.state.msTab).toBe('practice');
    expect(window.location.hash).toBe('#/practice');
    backSpy.mockRestore();
  });

  it('从历史进入某页时不回写 hash（否则会形成回环）', () => {
    window.app.showTab('word');
    const pushSpy = vi.spyOn(window.history, 'pushState').mockImplementation(function() {});
    const replaceSpy = vi.spyOn(window.history, 'replaceState').mockImplementation(function() {});

    window.app._applyTabFromHistory('practice');

    expect(pushSpy, '从历史进入时又压了一条').not.toHaveBeenCalled();
    expect(replaceSpy, '从历史进入时又改写了 hash').not.toHaveBeenCalled();
    expect(window.app.currentTab).toBe('practice');
    pushSpy.mockRestore();
    replaceSpy.mockRestore();
  });

  it('历史里出现未知页名时不动', () => {
    window.app.showTab('word');
    window.app._applyTabFromHistory('not-a-page');
    expect(window.app.currentTab).toBe('word');
  });
});

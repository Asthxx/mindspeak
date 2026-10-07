// 抽屉与 Android 返回键（P1-7 三档优先级的第一档）
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { bootstrapApp } from '../helpers/app-bootstrap.js';

describe('返回键第一档：关闭抽屉', () => {
  let sidebar;
  beforeEach(async () => {
    vi.resetModules();
    await bootstrapApp();
    sidebar = document.querySelector('.sidebar');
  });

  it('抽屉打开时按返回键：关抽屉、留在当前页（而不是跳回首页）', () => {
    window.app.showTab('word');
    sidebar.classList.add('open');
    window.history.pushState({ msDrawer: 1 }, '');

    const handled = window.app._onBackPressed();

    // 这是真机上长期失效的一条分支：_onBackPressed 原先用
    // getElementById('sidebar') 取抽屉，但抽屉的 id 是 sidebar-nav、class 才是 .sidebar，
    // 取到 null → 整个分支是死代码 → 抽屉打开时按返回键会直接跳回首页。
    expect(handled, '返回键没有被"关抽屉"这一档接管').toBe(true);
    expect(sidebar.classList.contains('open'), '抽屉没关').toBe(false);
    expect(window.app.currentTab, '关抽屉却把页面也切走了').toBe('word');
  });

  it('关抽屉不留悬空的占位条目（否则会吞掉一次返回键）', () => {
    window.app.showTab('word');
    sidebar.classList.add('open');
    window.history.pushState({ msDrawer: 1 }, '');

    window.app._onBackPressed();

    expect(window.history.state.msDrawer, '占位条目没被清掉 —— 首页按返回键会被静默吞掉一次')
      .toBeUndefined();
  });

  it('占位条目是同步清掉的，不再依赖异步的 history.back()', () => {
    const backSpy = vi.spyOn(window.history, 'back').mockImplementation(function() {});
    window.app.showTab('word');
    sidebar.classList.add('open');
    window.history.pushState({ msDrawer: 1 }, '');

    window.app._onBackPressed();

    expect(backSpy, '仍在靠异步的 history.back() 回收占位（历史上"切了又被弹回去"的根源）')
      .not.toHaveBeenCalled();
    backSpy.mockRestore();
  });

  it('抽屉没开时不接管，交给后面的弹窗 / 回首页 / 双击退出', () => {
    window.app.showTab('word');
    sidebar.classList.remove('open');
    window.history.replaceState({ msTab: 'word' }, '', '#/word');

    // 非首页 → 会被"回首页"这一档接管
    expect(window.app._onBackPressed()).toBe(true);
    expect(window.app.currentTab).toBe('home');
  });
});

describe('抽屉关合状态的一致性', () => {
  let sidebar;
  beforeEach(async () => {
    vi.resetModules();
    await bootstrapApp();
    sidebar = document.querySelector('.sidebar');
  });

  it('从抽屉里选过页面后，汉堡按钮仍能再次打开抽屉', () => {
    // showTab() 原来直接 remove('open') 关抽屉，绕过了 close() ——
    // 于是 close() 里负责清空的 lastFocus 没被清掉，而 open() 开头有
    // `if (lastFocus !== null) return;`，结果：从抽屉里选过一次页面之后，
    // 汉堡按钮此后**永远打不开抽屉**（真机上表现为按钮点了没反应）。
    const btn = document.getElementById('btn-menu');

    btn.click();                       // 第一次打开
    expect(sidebar.classList.contains('open'), '第一次没打开').toBe(true);

    window.app.showTab('word');        // 选一个页面，抽屉自动收起
    expect(sidebar.classList.contains('open'), '选页后抽屉没收起').toBe(false);

    btn.click();                       // 再点一次 —— 必须还能打开
    expect(sidebar.classList.contains('open'), '选过页面后汉堡按钮失效了').toBe(true);
  });

  it('切页关闭抽屉时不回收占位条目（交给 _writeHash 改写，避免多压一条）', () => {
    sidebar.classList.add('open');
    window.history.pushState({ msDrawer: 1 }, '');

    window.app.showTab('practice');

    // _writeHash 看到 msDrawer 会把这条占位改写成 practice 的条目
    expect(window.history.state.msDrawer).toBeUndefined();
    expect(window.history.state.msTab).toBe('practice');
    expect(sidebar.classList.contains('open')).toBe(false);
  });
});

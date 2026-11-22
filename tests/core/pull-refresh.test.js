// 行为级测试：Android 下拉刷新只在真正到顶部时触发（P1-4 回归网）
//
// 背景：页面滚动容器是 #main-content（body 不滚），window.scrollY 恒为 0。
// 旧判据用它判断"是否在顶部" → 恒真，列表滚到中间一下拉也会刷新（被 showTab 复位到顶部）。
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { bootstrapApp } from '../helpers/app-bootstrap.js';

function touch(el, type, clientY) {
  const ev = new window.Event(type, { bubbles: true, cancelable: true });
  const t = [{ clientX: 100, clientY }];
  Object.defineProperty(ev, 'touches', { value: t });
  Object.defineProperty(ev, 'changedTouches', { value: t });
  el.dispatchEvent(ev);
  return ev;
}

describe('Android 下拉刷新判据', () => {
  let page, scroller;

  beforeEach(async () => {
    vi.resetModules();
    await bootstrapApp();
    // 只有 Android 平台才装下拉刷新
    globalThis.App = { detectPlatform: () => 'android' };
    window.App = globalThis.App;
    await import('../../js/android-ui-init.js');
    window.AndroidUIInit.init();
    page = document.getElementById('page-word');
    scroller = document.getElementById('main-content');
    expect(page).toBeTruthy();
    expect(scroller).toBeTruthy();
    // 清掉上一个用例可能留下的指示器
    const old = document.getElementById('pull-refresh-indicator');
    if (old && old.parentNode) old.parentNode.removeChild(old);
  });

  it('滚动容器在中间时下拉：不显示指示器（旧实现会误触发）', () => {
    scroller.scrollTop = 400;
    touch(page, 'touchstart', 100);
    touch(page, 'touchmove', 220);   // 下拉 120px，超过 80px 阈值
    expect(document.getElementById('pull-refresh-indicator')).toBe(null);
  });

  it('容器在顶部时下拉：显示指示器且随距离加深', () => {
    scroller.scrollTop = 0;
    touch(page, 'touchstart', 100);
    touch(page, 'touchmove', 220);
    const ind = document.getElementById('pull-refresh-indicator');
    expect(ind).toBeTruthy();
    expect(Number(ind.style.opacity)).toBeGreaterThan(0);
  });

  it('下拉距离不足阈值时松手不触发刷新（指示器收起）', () => {
    scroller.scrollTop = 0;
    touch(page, 'touchstart', 100);
    touch(page, 'touchmove', 130);   // 只下拉 30px
    const ind = document.getElementById('pull-refresh-indicator');
    expect(ind).toBeTruthy();        // 跟手时会显示
    touch(page, 'touchend', 130);
    expect(Number(ind.style.opacity)).toBe(0);  // 松手后收起，未进入刷新态
  });
});

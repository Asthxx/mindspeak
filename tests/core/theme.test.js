// 主题第三态「跟随系统」与切换过渡（UI 审查 P3-2 / P3-3）
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { bootstrapApp } from '../helpers/app-bootstrap.js';

const root = resolve(__dirname, '../..');
const read = p => readFileSync(resolve(root, p), 'utf8');

// 可控的 prefers-color-scheme 桩
function stubColorScheme(dark) {
  const listeners = [];
  window.matchMedia = function (query) {
    const isScheme = /prefers-color-scheme/.test(query);
    return {
      matches: isScheme ? !!dark : false,
      media: query,
      addEventListener: function (type, cb) { if (type === 'change') listeners.push({ cb, query }); },
      removeEventListener: function () {},
      addListener: function (cb) { listeners.push({ cb, query }); },
      removeListener: function () {},
    };
  };
  return {
    listeners,
    setDark: function (v) {
      dark = v;
      listeners.forEach(function (l) {
        if (/prefers-color-scheme/.test(l.query)) l.cb({ matches: v, media: l.query });
      });
    },
  };
}

describe('主题第三态「跟随系统」（P3-2）', () => {
  let mq;

  afterEach(() => {
    localStorage.clear();
  });

  it('无历史选择时默认跟随系统：系统深色则深色', async () => {
    mq = stubColorScheme(true);
    vi.resetModules();
    await bootstrapApp();

    expect(document.documentElement.getAttribute('data-theme'), '没有跟随系统偏好').toBe('dark');
  });

  it('无历史选择时默认跟随系统：系统浅色则浅色', async () => {
    mq = stubColorScheme(false);
    vi.resetModules();
    await bootstrapApp();

    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
  });

  it('手动选择过则尊重手动选择，不再跟随系统', async () => {
    mq = stubColorScheme(true);
    vi.resetModules();
    await bootstrapApp();

    // 模拟"用户之前手动选了浅色，下次启动读存储"这一路径。
    // Storage 是 localStorage 的裸键包装（无前缀），bootstrapApp 每次会清空存储，
    // 所以只能在启动后写入再走一次 init()。
    localStorage.setItem('theme', 'light');
    window.ThemeToggle.init();

    expect(document.documentElement.getAttribute('data-theme'), '手动选择被系统偏好覆盖了').toBe('light');
    expect(window.ThemeToggle.mode()).toBe('light');
  });

  it('跟随系统模式下，系统切换主题时页面跟着切', async () => {
    mq = stubColorScheme(false);
    vi.resetModules();
    await bootstrapApp();
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');

    mq.setDark(true);
    expect(document.documentElement.getAttribute('data-theme'), '系统切深色后页面没跟随').toBe('dark');
  });

  it('切换按钮在三种状态间循环：浅 → 深 → 跟随系统 → 浅', async () => {
    mq = stubColorScheme(false);
    vi.resetModules();
    await bootstrapApp();

    const T = window.ThemeToggle;
    expect(T, 'ThemeToggle 未暴露').toBeTruthy();

    T.apply('light');
    T.toggle(); expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    T.toggle(); expect(T.mode(), '没有进入跟随系统态').toBe('system');
    T.toggle(); expect(document.documentElement.getAttribute('data-theme')).toBe('light');
  });
});

describe('主题切换过渡（P3-3）', () => {
  const styleCss = read('css/style.css');
  const designCss = read('css/design-system.css');

  it('body 与内容区有背景/文字色过渡，避免整屏色彩瞬变', () => {
    const css = styleCss + designCss;
    expect(css, '主题切换没有过渡，整屏色彩会瞬变').toMatch(/transition:[^;]*background-color[^;]*color|transition:[^;]*color[^;]*background-color/);
  });

  it('尊重 prefers-reduced-motion：降级为无过渡', () => {
    const css = styleCss + designCss;
    const blocks = css.match(/@media \(prefers-reduced-motion: reduce\)\s*\{[\s\S]*?\n\}/g) || [];
    const hit = blocks.some(b => /transition:\s*none/.test(b));
    expect(hit, '缺少主题过渡的 reduced-motion 降级').toBe(true);
  });
});

describe('令牌命名与死代码（P2-4）', () => {
  const designCss = read('css/design-system.css');
  const styleCss = read('css/style.css');

  it('补上语义别名 --brand-blue，并以品牌实际色相修正文件头描述', () => {
    expect(designCss, '缺少 --brand-blue 语义别名').toMatch(/--brand-blue:\s*var\(--sage\)/);
    // 文件头原写 "60% Warm Ivory  |  30% Deep Sage  |  10% Warm Coral"，
    // 但 --sage 实际是 #5B82A6 雾霾蓝、--ivory 是 #F4F6F8 冷灰白，名字全在骗人。
    // 断言"那句原话必须已经不在"，而不是禁掉 Warm Coral 这个词——
    // 新注释里要引用旧描述说明问题，禁词会误伤。
    expect(designCss.slice(0, 600), '文件头仍是旧的错误描述')
      .not.toContain('60% Warm Ivory  |  30% Deep Sage  |  10% Warm Coral');
    expect(designCss.slice(0, 600), '文件头未写明品牌色实际色相').toContain('#5B82A6');
  });
});

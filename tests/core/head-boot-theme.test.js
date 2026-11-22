// 首帧主题解析（P1-3 回归网）
//
// 背景：localStorage.theme 是「用户选择」三态（light/dark/system），CSS 只认
// data-theme="light|dark"。旧 head-boot 把 'system' 原样写进 data-theme —— 没有规则匹配，
// 首帧只能落默认亮色，直到 DOMContentLoaded 才切深色（实测 21ms→199ms 闪白）。
// 这里直接执行 head-boot.js 的真实源码，锁住"首帧即为最终配色"。
import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
// 必须显式安装存储 mock：不能依赖环境自带的 localStorage。
// 本地（Node 22 + jsdom）裸 localStorage 恰好可用，但 CI（Node 26）里它是 undefined，
// 同一 worker 里前一个用例若没装过 mock，这里就 "Cannot read properties of undefined (reading 'clear')"。
import { installFreshStorage } from '../helpers/app-bootstrap.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const SRC = readFileSync(join(root, 'js', 'head-boot.js'), 'utf8');
const origMatchMedia = globalThis.matchMedia;

beforeAll(() => {
  installFreshStorage();
});

function stubColorScheme(dark) {
  globalThis.matchMedia = (q) => ({
    matches: !!dark && String(q).indexOf('prefers-color-scheme') !== -1,
    media: q,
    addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {},
    dispatchEvent() { return false; }
  });
  if (window) window.matchMedia = globalThis.matchMedia;
}

// 以普通 <script> 的语义（全局作用域）执行 head-boot
function runHeadBoot(storedTheme, dark) {
  localStorage.clear();
  if (storedTheme !== null) localStorage.setItem('theme', storedTheme);
  stubColorScheme(!!dark);
  document.documentElement.removeAttribute('data-theme');
  document.documentElement.removeAttribute('data-theme-mode');
  (0, eval)(SRC);
  return {
    theme: document.documentElement.getAttribute('data-theme'),
    mode: document.documentElement.getAttribute('data-theme-mode')
  };
}

afterEach(() => {
  globalThis.matchMedia = origMatchMedia;
  if (window) window.matchMedia = origMatchMedia;
  localStorage.clear();
});

describe('head-boot 首帧主题', () => {
  it('存储 system + 系统深色 → 首帧就是 dark（不再等 DOMContentLoaded）', () => {
    const r = runHeadBoot('system', true);
    expect(r.theme).toBe('dark');
    expect(r.mode).toBe('system');
  });

  it('存储 system + 系统浅色 → light', () => {
    expect(runHeadBoot('system', false).theme).toBe('light');
  });

  it('从未选过（无存储）+ 系统深色 → 默认跟随系统，首帧 dark', () => {
    expect(runHeadBoot(null, true).theme).toBe('dark');
  });

  it('手动选 light + 系统深色 → 手动优先，首帧 light', () => {
    expect(runHeadBoot('light', true).theme).toBe('light');
  });

  it('手动选 dark + 系统浅色 → 首帧 dark', () => {
    expect(runHeadBoot('dark', false).theme).toBe('dark');
  });

  it('data-theme 永远不出现 "system"（CSS 里没有该选择器）', () => {
    for (const dark of [true, false]) {
      for (const mode of ['system', 'light', 'dark', null, 'garbage']) {
        const r = runHeadBoot(mode, dark);
        expect(r.theme, 'mode=' + mode + ' dark=' + dark).toMatch(/^(light|dark)$/);
      }
    }
  });
});

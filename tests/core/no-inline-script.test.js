import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

// CSP 彻底收紧（script-src 'self'，无 unsafe-inline）的前提：
// 1. index.html 不能有内联 <script> 块（全部提取为 js/head-boot.js）
// 2. 不能有内联事件属性（onclick= 等，CSP 下视为 inline script 一并阻断）
// 3. js/head-boot.js 必须存在且包含原 head 关键逻辑（视口/主题/平台/SW）
// 4. index.html 必须引用 head-boot.js
//
// 第 2 条必须同时扫 js/**/*.js：CSP 管的是"最终 DOM 里的内联属性"，
// 由 innerHTML 模板拼出来的 onclick 与写在 index.html 里的完全等价、同样被拦。
// 2026-11-22 的阅读题按钮就是这么漏过去的（只扫 HTML → 全绿，实际点了没反应）。

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const read = (p) => readFileSync(join(root, p), 'utf8');

// 递归收集 js/ 下的所有脚本（不含 tests / node_modules）
function collectJs(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) collectJs(full, out);
    else if (name.endsWith('.js')) out.push(full);
  }
  return out;
}

// 标签内的内联事件属性：<button ... onclick= / <div onmouseover= ...
// 不能写成 /\son\w+=/ —— 那会误伤 JS 里的 u.onerror = fn 这类正常赋值。
const INLINE_HANDLER_IN_TAG = /<[a-zA-Z][\w-]*[^>]*?\son[a-z]+\s*=/;

describe('内联脚本清零（CSP script-src 收紧前提）', () => {
  it('index.html 不存在内联 <script> 块（open 标签均带 src）', () => {
    const html = read('index.html');
    const opens = (html.match(/<script(?:\s|>)/g) || []).length;
    const withSrc = (html.match(/<script src=/g) || []).length;
    expect(opens).toBe(withSrc);
  });

  it('index.html 不存在内联事件属性', () => {
    const html = read('index.html');
    expect(/ on[a-z]+=/.test(html)).toBe(false);
  });

  it('js/**/*.js 里 innerHTML 模板也不得拼内联事件属性（CSP 同样阻断）', () => {
    const offenders = [];
    for (const file of collectJs(join(root, 'js'))) {
      const src = readFileSync(file, 'utf8');
      const m = src.match(INLINE_HANDLER_IN_TAG);
      if (m) offenders.push(file.replace(root, '').replace(/\\/g, '/') + ' → ' + m[0].slice(0, 60));
    }
    expect(offenders, offenders.join('\n')).toEqual([]);
  });

  it('index.html 引用了 js/head-boot.js', () => {
    const html = read('index.html');
    expect(html).toContain('<script src="js/head-boot.js');
  });
});

describe('head-boot.js 内容完整性', () => {
  it('必须包含视口兜底 / 主题防闪烁 / 平台检测 / SW 注册四段关键逻辑', () => {
    const src = read('js/head-boot.js');
    expect(src).toContain('devicePixelRatio');
    expect(src).toContain("localStorage.getItem('theme')");
    expect(src).toContain('platform-android');
    expect(src).toContain("serviceWorker.register('sw.js'");
  });
});
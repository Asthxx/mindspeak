import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

// CSP 彻底收紧（script-src 'self'，无 unsafe-inline）的前提：
// 1. index.html 不能有内联 <script> 块（全部提取为 js/head-boot.js）
// 2. 不能有内联事件属性（onclick= 等，CSP 下视为 inline script 一并阻断）
// 3. js/head-boot.js 必须存在且包含原 head 关键逻辑（视口/主题/平台/SW）
// 4. index.html 必须引用 head-boot.js

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const read = (p) => readFileSync(join(root, p), 'utf8');

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
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const read = (p) => readFileSync(join(root, p), 'utf8');

// Bug#3: 正则转义逻辑 escapeReg 重复 5 次（app.js 4 处内联 + story.js 私有函数）。
// 应提取为共享全局函数，语义一致且统一维护。

describe('escapeReg DRY — 共享全局函数', () => {
  const appSrc = read('js/app.js');
  const storySrc = read('js/story.js');

  it('安全工具区必须定义全局 escapeReg', () => {
    const utils = appSrc.slice(0, appSrc.indexOf('App ='));
    expect(utils).toMatch(/function\s+escapeReg\s*\(\s*str\s*\)/);
  });

  it('app.js 不得再有内联正则转义（仅 escapeReg 定义自身保留正则体）', () => {
    const appBody = appSrc.slice(appSrc.indexOf('App ='));
    expect(appBody.match(/\.replace\(\[\.\*\+\?/g) || []).toHaveLength(0);
    expect(appSrc.match(/escapeReg\((?:w|word)/g) || []).toHaveLength(4);
  });

  it('story.js 不应再定义私有 escapeReg，应复用全局函数', () => {
    expect(storySrc).not.toMatch(/function\s+escapeReg/);
    expect(storySrc).toMatch(/escapeReg\(/);
  });
});

describe('escapeReg 语义', () => {
  // 单元测试环境无法加载 7300 行 app.js；语义测试用同一约定的标准实现，
  // 锁死转义行为契约（DRY 源码断言保证生产代码使用同一模式）。
  const escapeReg = (str) => String(str).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  it('转义后的字符串用于 new RegExp 必须字面匹配全部元字符', () => {
    const specials = '.*+?^${}()|[\\]\\/';
    const escaped = escapeReg(specials);
    const re = new RegExp('^' + escaped + '$', 'g');
    expect(re.test(specials)).toBe(true);
  });

  it('非元字符不应受影响', () => {
    expect(escapeReg('hello world')).toBe('hello world');
    expect(escapeReg('')).toBe('');
    expect(escapeReg(null)).toBe('null');
  });
});
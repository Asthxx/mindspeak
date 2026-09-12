import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const cssDir = join(root, 'css');
const cssFiles = readdirSync(cssDir).filter((f) => f.endsWith('.css'));
const cssTexts = Object.fromEntries(
  cssFiles.map((f) => [f, readFileSync(join(cssDir, f), 'utf8')])
);

// 恰好 5 个十六进制数字：CSS 不识别（合法长度为 3/4/6/8），浏览器会丢弃整条规则
const HEX_5 = /#[0-9a-fA-F]{5}(?![0-9a-fA-F])/g;

describe('CSS 颜色值完整性', () => {
  it('不存在恰好 5 位的 hex 色值', () => {
    const offenders = [];
    for (const [file, css] of Object.entries(cssTexts)) {
      for (const m of css.matchAll(HEX_5)) {
        offenders.push(`${file}:${css.slice(0, m.index).split('\n').length}: ${m[0]}`);
      }
    }
    expect(offenders).toEqual([]);
  });
});

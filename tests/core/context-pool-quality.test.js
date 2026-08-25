import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const src = readFileSync(join(root, 'js', 'app.js'), 'utf8');

// 语境填空题池数据质量守卫：
// 12 万词典里有残片词条（例句字段为 'n. See Camlet.' 式交叉引用、或例句根本不含该词），
// 挖空替换无效 → 出"没有空可填"的怪题。题池构建必须过滤。

describe('ContextModule 题池数据质量', () => {
  const start = src.indexOf('ContextModule.prototype.start');
  const body = src.slice(start, src.indexOf('ContextModule.prototype.showQuestion'));

  it('例句必须真正包含单词（挖空必须生效）', () => {
    // 源码形如 new RegExp('\\b' + _sw + '\\b', 'i').test(_ex)
    expect(body).toContain("new RegExp('\\\\b'");
    expect(body).toMatch(/\.test\(_ex\)/);
  });

  it('过滤 "See X" 式词典交叉引用残片', () => {
    expect(body).toMatch(/See\s/);
  });

  it('过滤过短例句（无语境价值）', () => {
    expect(body).toMatch(/length\s*<\s*\d+/);
  });
});

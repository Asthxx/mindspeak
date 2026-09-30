import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

// 编码回归：audit-dead-ids.ps1 曾按 GB18030 解码 index.html / js/app.js，
// 而这两个文件实测是「无 BOM 的 UTF-8」，导致中文标签被解成乱码
// （"按回车发送" -> "按回车发?"），审计输出不可信。
// 这里锁死：脚本必须用 UTF-8 严格解码，且不得回退到 GB 系编码。

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const SCRIPT = join(root, 'scripts', 'audit-dead-ids.ps1');
const raw = readFileSync(SCRIPT, 'utf8');
const code = raw.split(/\r?\n/).filter(l => !/^\s*#/.test(l)).join('\n');

describe('audit-dead-ids.ps1 编码必须正确', () => {
  it('不得使用 GB18030 / GBK / GB2312 解码源码', () => {
    expect(code, 'GB 系解码会把 UTF-8 中文解成乱码').not.toMatch(/GB18030|GBK|GB2312/);
  });

  it('必须以 UTF-8 读取 index.html 与 js/app.js', () => {
    expect(code).toMatch(/UTF8Encoding|UTF8\b/);
    expect(code).toMatch(/index\.html/);
    expect(code).toMatch(/js[\\/]app\.js|js\\app\.js/);
  });
});

describe('被审计的源文件确实是 UTF-8（前提校验）', () => {
  it.each(['index.html', 'js/app.js'])('%s 必须是无 BOM 的合法 UTF-8', (rel) => {
    const buf = readFileSync(join(root, rel));
    // 无 BOM
    const hasBom = buf[0] === 0xef && buf[1] === 0xbb && buf[2] === 0xbf;
    expect(hasBom, `${rel} 不应有 UTF-8 BOM`).toBe(false);
    // 严格 UTF-8 解码：非法字节会抛异常（GB 系编码在此必然失败）
    const strict = new TextDecoder('utf-8', { fatal: true });
    expect(() => strict.decode(buf), `${rel} 不是合法 UTF-8`).not.toThrow();
  });

  it('index.html 里的中文能按 UTF-8 正确还原（不被截断）', () => {
    const txt = readFileSync(join(root, 'index.html'), 'utf8');
    // 完整短语；GB18030 误解码时末字会丢
    expect(txt).toContain('按回车发送');
    expect(txt).not.toContain('按回车发�');
  });
});

describe('scripts/ 目录无编码歧义残留', () => {
  it('所有 .ps1/.mjs 均可按 UTF-8 严格解码', () => {
    const dir = join(root, 'scripts');
    const files = readdirSync(dir).filter(f => /\.(ps1|mjs)$/i.test(f));
    expect(files.length, 'scripts/ 下未找到待检文件').toBeGreaterThan(0);
    const strict = new TextDecoder('utf-8', { fatal: true });
    for (const f of files) {
      expect(() => strict.decode(readFileSync(join(dir, f))), `${f} 不是合法 UTF-8`).not.toThrow();
    }
  });
});

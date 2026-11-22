import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

// Tauri CSP 显式化护栏：tauri.conf.json csp:null（依赖页面自带 meta CSP，作为唯一进化源，
// 避免与配置文件双份漂移）。桌面打包时必须验证 dist 的 meta CSP 仍是收紧形态，
// 否则未来有人删掉/放宽 index.html 的 CSP 后桌面包（完全依赖页面 meta）会失去防护。
// 2026-09-05 收紧：内联脚本已全部提取为 js/head-boot.js，script-src 不得再含 'unsafe-inline'。

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const read = (p) => readFileSync(join(root, p), 'utf8');

describe('桌面打包 CSP 护栏', () => {
  it('dist/index.html 必须含收紧的 meta CSP 且 script-src 无 unsafe-inline（防构建产物漂移）', () => {
    const html = read('dist/index.html');
    const m = /<meta http-equiv="Content-Security-Policy" content="([^"]+)"/.exec(html);
    expect(m).toBeTruthy();
    expect(m[1]).toContain("script-src 'self'");
    expect(m[1]).not.toContain("script-src 'self' 'unsafe-inline'");
    expect(m[1]).toContain('connect-src');
    expect(m[1]).toContain('127.0.0.1:3000');
    expect(m[1]).toContain("object-src 'none'");
    // frame-ancestors 在 <meta> 里会被浏览器忽略（还会每次加载打一条 CSP 警告，
    // 被前端 logger 写进 app.log）。防嵌入改由服务端 X-Frame-Options 下发。
    expect(m[1]).not.toContain('frame-ancestors');
  });

  it('服务端必须下发 X-Frame-Options（meta 里没有 frame-ancestors，这是唯一防线）', () => {
    const server = read('server/server.js');
    expect(server).toContain("res.setHeader('X-Frame-Options', 'SAMEORIGIN')");
  });

  it('desktop-pack.js 打包时必须校验 meta CSP（防未来删除/放宽）', () => {
    const pack = read('scripts/desktop-pack.js');
    expect(pack).toContain('Content-Security-Policy');
    expect(pack).toContain("object-src[^;]*'none'");
    expect(pack).toContain('unsafe-inline');
  });
});
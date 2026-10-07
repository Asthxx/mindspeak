// 源码级守卫：index.html 的标签卫生（UI 审查 P3-1 / P3-5）
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(__dirname, '../..');
const html = readFileSync(resolve(root, 'index.html'), 'utf8');

describe('index.html 标签卫生（P3-1 / P3-5）', () => {
  it('不得存在 class="icon…"" 这种多一个引号的畸形属性', () => {
    // 这个畸形不只是难看：多出来的引号会把紧跟其后的属性吞掉。
    // 实测 <svg class="icon"" aria-hidden="true" …> 里的 aria-hidden 会被解析器丢掉，
    // 装饰性图标因此进到无障碍树里。
    const bad = html.match(/class="icon[^"]*""/g) || [];
    expect(bad.length, '仍有 ' + bad.length + ' 处畸形引号：' + (bad[0] || '')).toBe(0);
  });

  it('装饰性图标必须带 aria-hidden 或 focusable=false', () => {
    const svgs = html.match(/<svg\b[^>]*>/g) || [];
    expect(svgs.length).toBeGreaterThan(50);
    let missing = 0;
    for (const tag of svgs) {
      if (!/aria-hidden="true"/.test(tag) && !/focusable="false"/.test(tag)) missing++;
    }
    expect(missing, '有 ' + missing + ' 个 <svg> 既没有 aria-hidden 也没有 focusable=false').toBe(0);
  });

  it('移动端「更多工具」按钮必须带基础按钮样式类（P3-5）', () => {
    // 只有 btn-sm + word-tools-toggle 时，.word-tools-toggle 在 mobile.css 里
    // 只给了 display:inline-flex，其余走浏览器默认 —— 渲染成深色 3D 边框，
    // 是移动端背单词页最"跳出"的元素。
    const m = html.match(/<button[^>]*id="btn-word-tools"[^>]*>/) || [];
    expect(m.length, '未找到 #btn-word-tools').toBe(1);
    // 必须按"类 token"判断，不能正则匹配 \bbtn\b —— 那会命中 btn-sm 里的子串，
    // 本测试初版就是这么假通过的
    const cls = (m[0].match(/class="([^"]*)"/) || ['', ''])[1];
    const tokens = cls.split(/\s+/).filter(Boolean);
    expect(tokens, '类列表：' + cls).toContain('btn');
  });
});

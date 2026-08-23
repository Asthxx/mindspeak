import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const rawCss = readFileSync(join(root, 'css', 'android.css'), 'utf8');
const css = rawCss.replace(/\/\*[\s\S]*?\*\//g, ''); // 剥离块注释

// 解析为 [{selector, body}]，容忍多行格式与选择器分组
const RULES = [];
{
  const re = /([^{}]+)\{([^}]*)\}/g;
  let m;
  while ((m = re.exec(css)) !== null) {
    RULES.push({ selector: m[1].trim(), body: m[2].trim() });
  }
}

// Android 练习页筛选区遮挡回归测试：
// 根因：#page-spelling/#page-pk/#page-context/#page-speak 的 .section-header
// 曾设 position:sticky;top:0;z-index:10，≤768px 时筛选区纵向堆叠高约 250-280px，
// 下滑时题目内容从其下方穿过被遮挡。语法页此前已修复为 static。

const PAGES = ['spelling', 'pk', 'context', 'speak', 'grammar'];

describe('练习页筛选区不吸顶 — css/android.css', () => {
  const rulesFor = (page) =>
    RULES.filter((r) => r.selector.split(',').some((s) => s.includes('#page-' + page + ' .section-header')));

  it('practice_pages_section_header_not_sticky', () => {
    for (const page of PAGES) {
      const rs = rulesFor(page);
      expect(rs.length, 'missing .section-header rule for #page-' + page).toBeGreaterThan(0);
      for (const r of rs) {
        expect(r.body.replace(/\s+/g, ''), '#page-' + page + ' must not be sticky').not.toContain('position:sticky');
        expect(r.body.replace(/\s+/g, ''), '#page-' + page + ' must be static').toContain('position:static');
      }
    }
  });

  it('no_z_index_overlay_left_on_section_headers', () => {
    // 吸顶遮罩三件套不得残留在练习页筛选区规则中
    for (const page of PAGES) {
      for (const r of rulesFor(page)) {
        expect(r.selector + '{' + r.body + '}', '#page-' + page).not.toMatch(/z-index|top:\s*0/);
      }
    }
  });

  it('rules_scoped_to_android_platform_only', () => {
    // 所有 .section-header 规则必须限定在 platform-android 下，桌面端不受影响
    for (const r of RULES) {
      if (!r.selector.includes('.section-header')) continue;
      for (const seg of r.selector.split(',')) {
        if (seg.includes('.section-header')) {
          expect(seg, 'selector not platform-scoped: ' + seg.trim()).toContain('platform-android');
        }
      }
    }
  });

  it('reserved_practice_header_sticky_untouched', () => {
    // 备用 DOM 的紧凑练习头（.page-group-practice .practice-header）保持原样
    const r = RULES.find((r) => r.selector.includes('.practice-header'));
    expect(r).toBeTruthy();
    expect(r.body.replace(/\s+/g, '')).toContain('position:sticky');
  });
});

// 设计令牌收敛守卫（UI 审查 P2-1 / P2-2 / P2-3 / P2-5）
//
// 这些断言不是"必须归零"的理想值，而是**只能变小、不能变大**的天花板。
// 数值来自 scripts/measure-token-drift.mjs（可重复执行），先按下述上限锁死，
// 再逐批往下压 —— 报告自己也建议这么做："先设个上限逐步压"。
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { measure } from '../../scripts/measure-token-drift.mjs';

const root = resolve(__dirname, '../..');
const read = p => readFileSync(resolve(root, p), 'utf8');
const designCss = read('css/design-system.css');
const styleCss = read('css/style.css');

describe('设计令牌收敛（P2-1 / P2-2 / P2-5）', () => {
  const m = measure();

  it('字号：硬编码声明数不超过上限', () => {
    // 基线 345 → 本批吸附到 8 级字阶后剩 11 处，全部是 2.6rem(41.6px)～5rem(80px)
    // 的展示级字号（大标题/空状态图标旁的数字）。它们是有意的排版尺寸，
    // 吸附到 4xl(36) 会一次掉 5px 以上，所以保留；上限锁死在 11。
    expect(m.fontSizeHard, '字号硬编码 ' + m.fontSizeHard + ' 处，高频值：' +
      [...m.fontSizeValues.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([k, v]) => k + '×' + v).join(' '))
      .toBeLessThanOrEqual(11);
  });

  it('字阶令牌齐备 8 级：12/13/14/16/18/20/24/30', () => {
    // 13px 是报告新增的一级（12 与 14 之间原本靠 0.85rem(13.6) 硬编码填补）
    expect(designCss).toMatch(/--text-2xs:\s*0\.8125rem/);
    for (const t of ['xs', 'sm', 'base', 'lg', 'xl', '2xl', '3xl']) {
      expect(designCss, '缺少 --text-' + t).toMatch(new RegExp('--text-' + t + ':'));
    }
  });

  it('行高有配对令牌，不再散落各处', () => {
    for (const t of ['--leading-tight', '--leading-normal', '--leading-relaxed']) {
      expect(designCss, '缺少 ' + t).toContain(t);
    }
  });

  it('间距：脱离 8pt 栅格的裸 px 不超过上限', () => {
    // 基线 203 → 本批把 6px（图标-文字光学间距，42 处）与 2px（发丝线）显式令牌化后 161。
    // 剩下的 10px(45) / 14px(30) 是"就近吸附"的双向选择（10 离 8 和 12 一样远，
    // 14 离 12 和 16 一样远），机械映射是拍脑袋，且 75 处同时 ±2px 有布局风险，
    // 留给下一批逐处判断。这里先把天花板锁在 165：只能变小，不能变大。
    expect(m.spacingOffGrid, '脱轨间距 ' + m.spacingOffGrid + ' 处，分布：' +
      [...m.spacingValues.entries()].filter(([k]) => ![4, 8, 12, 16, 24, 32, 48, 64].includes(k))
        .sort((a, b) => b[1] - a[1]).map(([k, v]) => k + 'px×' + v).join(' '))
      .toBeLessThanOrEqual(165);
  });

  it('硬编码 hex 数量不超过上限（P2-3，只锁不增）', () => {
    // 基线 428 → 本批清掉 sage 家族手抄蓝后 402（其中 26 处是"改回具体色值"的
    // 令牌定义——批量替换曾把它们也换成 var()，造成自引用，见上一个 describe）。
    // 剩下的是主题包、渐变、阴影等难以机械令牌化的值，先把天花板锁在 360，只减不增。
    // （度量已剥掉注释：注释里写"原 #E5E2DC → #E4E8EC"是文档，不该算硬编码颜色。）
    expect(m.hardHex, '硬编码 hex ' + m.hardHex + ' 处（去重 ' + m.hardHexUnique + '）').toBeLessThanOrEqual(360);
  });

  it('间距例外必须显式令牌化（--sp-icon-gap / --sp-hairline），不许裸写', () => {
    expect(designCss).toMatch(/--sp-icon-gap:\s*6px/);
    expect(designCss).toMatch(/--sp-hairline:\s*2px/);
  });

  it('圆角只保留一套命名：CSS 里不得再用 var(--r-*) 别名', () => {
    // 基线 99 处（style.css:20-24 做了等价映射）——同一值两种写法，写错也不报错
    expect(m.radiusAliasUse, '仍有 ' + m.radiusAliasUse + ' 处 var(--r-*)').toBe(0);
    expect(styleCss).not.toMatch(/--r-(?:sm|md|lg|xl|full|xs):\s*var\(--radius-/);
  });

  it('圆角不再有脱离档位的裸值', () => {
    expect(m.radiusOffScale, '仍有 ' + m.radiusOffScale + ' 处圆角不在 4/8/12/16/20/24 档位内').toBe(0);
  });
});

describe('跨文件重复选择器（P2-4b）', () => {
  it('design-system.css 与 style.css 的同名选择器不超过 10 个', () => {
    // style.css 加载更晚，永远胜出 —— design-system.css 里的同名规则是死代码：
    // 改它不生效，而且不会报错。基线 11（含已被删除的 .btn-primary），锁在 10 只减不增。
    // 完整清单：node scripts/check-css-duplicates.mjs
    const strip = s => s.replace(/\/\*[\s\S]*?\*\//g, '');
    const sels = src => {
      const set = new Set();
      for (const m of strip(src).matchAll(/(^|\})\s*([^{}@]+)\{/g)) {
        for (const one of m[2].split(',').map(x => x.trim()).filter(Boolean)) {
          if (one.length > 60 || one.includes(':')) continue;
          set.add(one);
        }
      }
      return set;
    };
    const design = sels(designCss);
    const style = sels(read('css/style.css'));
    const dup = [...design].filter(k => style.has(k));
    expect(dup.length, '重复选择器：' + dup.join(' ')).toBeLessThanOrEqual(10);
  });
});

describe('令牌不得自引用（本次批量收敛踩到的坑）', () => {
  it('任何 --x: var(--x) 都会让该令牌整体失效', () => {
    // 批量把 hex 替换成令牌时，很容易连"令牌定义行本身"一起替换，
    // 产出 --sage-deep: var(--sage-deep); 这种自引用。
    // CSS 变量自引用是无效声明（计算值回退到 inherit），**不会报任何错**，
    // 只是那个颜色整体失效 —— 本次实测导致主按钮渐变被冲淡成近乎透明。
    const files = require('node:fs').readdirSync(resolve(root, 'css')).filter(f => f.endsWith('.css'));
    const bad = [];
    for (const f of files) {
      const lines = read('css/' + f).split(/\r?\n/);
      lines.forEach((line, i) => {
        const m = line.match(/^\s*(--[a-z0-9-]+)\s*:\s*var\(\s*(--[a-z0-9-]+)\s*\)\s*;/i);
        if (m && m[1] === m[2]) bad.push(`css/${f}:${i + 1} ${m[1]}`);
      });
    }
    expect(bad, '自引用令牌：' + bad.join(' | ')).toEqual([]);
  });

  it('sage 家族五个令牌在浅色与深色主题下都是具体色值', () => {
    // 防止再被"全体替换成 var()"的批处理污染
    for (const name of ['--sage', '--sage-deep', '--sage-muted', '--sage-light', '--sage-hover']) {
      const vals = [...designCss.matchAll(new RegExp(name + ':\\s*([^;]+);', 'g'))].map(m => m[1].trim());
      expect(vals.length, name + ' 缺少定义').toBeGreaterThanOrEqual(2);
      for (const v of vals) {
        expect(v, name + ' 被定义成了 var()，应为具体色值').toMatch(/^#[0-9A-Fa-f]{6}$/);
      }
    }
  });
});

describe('配色一致性（P2-3）', () => {
  it('--border / --border-light 与背景同属冷色家族（色相差 ≤30°）', () => {
    // 原 --border #E5E2DC 是 H40° 暖米色，与 H210° 的卡面/品牌色相差 170°，
    // 落在对立面 —— 这是"暖米白+绿 sage"时代的遗留（文件头注释至今还那么写）
    const hue = hex => {
      const [r, g, b] = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255);
      const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min;
      if (d === 0) return 0;
      let h;
      if (max === r) h = ((g - b) / d) % 6;
      else if (max === g) h = (b - r) / d + 2;
      else h = (r - g) / d + 4;
      return (h * 60 + 360) % 360;
    };
    const pick = name => {
      const mm = designCss.match(new RegExp(name + ':\\s*(#[0-9A-Fa-f]{6})'));
      expect(mm, '未找到 ' + name).toBeTruthy();
      return mm[1];
    };
    const bg = pick('--ivory');
    for (const n of ['--border', '--border-light']) {
      const d = Math.abs(hue(pick(n)) - hue(bg));
      const diff = Math.min(d, 360 - d);
      expect(diff, `${n} 与 --ivory 色相差 ${diff.toFixed(0)}°`).toBeLessThanOrEqual(30);
    }
  });

  it('sage 家族的 8 个蓝色手抄变体不得再出现', () => {
    // 这些本该全部走 --sage / --sage-deep / --sage-light / --sage-muted
    const files = ['css/style.css', 'css/mobile.css', 'css/dashboard.css', 'css/ai-chat.css', 'css/nav.css'];
    for (const f of files) {
      // 剥注释：注释里会写"起点改 --sage-hover #4A6F93"这类说明，那是文档不是用色
      const s = read(f).replace(/\/\*[\s\S]*?\*\//g, '').toLowerCase();
      for (const hex of ['#4a6f93', '#3a63b8', '#2563eb', '#5e8fb8']) {
        expect(s, f + ' 仍有手抄蓝 ' + hex).not.toContain(hex);
      }
    }
  });

  it('--info 不得与 --sage 同为 H207–209° 却当成两种颜色', () => {
    // 报告建议：与 sage 合并，或明确拉开到青色 H190°
    const mm = designCss.match(/--info:\s*(#[0-9A-Fa-f]{6})/);
    expect(mm).toBeTruthy();
    expect(mm[1].toUpperCase(), '--info 仍是原值，与 --sage 色相几乎相同').not.toBe('#42A5F5');
  });
});

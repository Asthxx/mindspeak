// 视觉一致性收尾（UI 审查 P2-6 / P3-4 / P3-8 / P3-11 / P3-12）
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(__dirname, '../..');
const read = p => readFileSync(resolve(root, p), 'utf8');
const html = read('index.html');
const navCss = read('css/nav.css');
const styleCss = read('css/style.css');

// 规则的边界：禁的是**彩色 emoji**（跨平台形状/色彩完全不同，且线宽与 sprite 对不齐）。
// 不禁 U+2600–27BF 里的单色排版符号（✓ ✗ ★ ⚠）—— 它们在任何系统都渲染成同一个字形，
// 用在「✓ 正确！」这类文字反馈里是排版惯例，不是图标。
const EMOJI = /[\u{1F300}-\u{1FAFF}\u{2B00}-\u{2BFF}\u{FE0F}]/u;

// 注释里会引用"原来用的是 ⭐/❌/📤"、"原 #E0E7FF 是 Tailwind 残留"来说明改动，
// 那些是文档不是违规内容 —— 所有断言都必须先剥注释，否则"补文档"反而让测试变红。
// HTML 文件里还得连 <!-- --> 一起剥（本文件既有 CSS 注释也有 HTML 注释）
const stripCss = s => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/<!--[\s\S]*?-->/g, '');
const stripJs = s => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');

describe('图标只用 SVG sprite（P2-6）', () => {
  it('android-ui-init.js 的操作菜单与完成弹层不得再用 emoji 当图标', () => {
    const s = stripJs(read('js/android-ui-init.js'));
    const hits = s.split(/\r?\n/).filter(l => EMOJI.test(l));
    expect(hits.length, '仍有 emoji：' + (hits[0] || '').trim().slice(0, 60)).toBe(0);
  });

  it('「支持开发者」页不得再用 emoji 当图标', () => {
    const page = stripCss((html.match(/<section id="page-support"[\s\S]*?<\/section>/) || [''])[0]);
    expect(page.length, '未找到 page-support').toBeGreaterThan(100);
    const hits = page.split(/\r?\n/).filter(l => EMOJI.test(l));
    expect(hits.length, '仍有 emoji：' + (hits[0] || '').trim().slice(0, 60)).toBe(0);
  });

  it('items.js 的兑换提示不得含 emoji', () => {
    const s = read('js/items.js');
    expect(EMOJI.test(s), 'items.js 仍有 emoji').toBe(false);
  });

  it('全仓不再出现彩色 emoji 当图标（规则锁定）', () => {
    const dir = resolve(root, 'js');
    const files = ['index.html', ...readdirSync(dir).filter(f => f.endsWith('.js')).map(f => 'js/' + f)];
    const offenders = [];
    for (const f of files) {
      stripJs(read(f)).split(/\r?\n/).forEach((l, i) => {
        if (EMOJI.test(l)) offenders.push(f + ':' + (i + 1));
      });
    }
    expect(offenders, '仍有彩色 emoji：' + offenders.slice(0, 5).join(' ')).toEqual([]);
  });

  it('sprite 里补齐了替换所需的图标', () => {
    for (const id of ['i-star', 'i-share', 'i-mail', 'i-heart', 'i-coffee', 'i-palette']) {
      expect(html, 'sprite 缺少 #' + id).toContain(`id="${id}"`);
    }
  });
});

describe('配色残留（P3-4）', () => {
  it('Tailwind indigo/violet 残留不得再出现', () => {
    // #E0E7FF / #C7D2FE / #7C3AED 是 Tailwind 的 indigo-100/200、violet-600，
    // 不在本项目色板内，也不随深色主题翻转
    const files = readdirSync(resolve(root, 'css')).filter(f => f.endsWith('.css'));
    const BAD = /#e0e7ff|#c7d2fe|#7c3aed/i;
    for (const f of files) {
      const css = stripCss(read('css/' + f));
      // 按选择器逐条判断：主题色包（[data-theme-id=] / [data-theme-color=]）是
      // **有意**自成一整套色板的，aurora 主题的紫青渐变里出现 #7c3aed 是设计内容，
      // 不是"Tailwind 残留"。只有主题包之外的规则才算违规。
      const offenders = [];
      for (const m of css.matchAll(/([^{}]+)\{([^}]*)\}/g)) {
        const sel = m[1].trim();
        if (/\[data-theme-(?:id|color)=/.test(sel)) continue;
        if (BAD.test(m[2])) offenders.push(sel + ' { ' + m[2].trim().slice(0, 60) + ' }');
      }
      expect(offenders, `css/${f} 仍有 Tailwind 残留：` + offenders.join(' | ')).toEqual([]);
    }
  });
});

describe('装饰母题一致性（P3-8）', () => {
  it('单词卡的四角装饰括号已移除（孤立的装饰母题会被读成渲染残留）', () => {
    expect(styleCss).not.toMatch(/\.word-card::(before|after)/);
  });
});

describe('顶栏只放身份类信息（P3-11）', () => {
  it('.stats-bar 不再重复首页已有的学习数据', () => {
    const bar = stripCss((html.match(/<div class="stats-bar"[\s\S]*?<\/div>/) || [''])[0]);
    expect(bar.length).toBeGreaterThan(50);
    // 保留：等级 / 积分（身份）。移除：连续打卡 / 已掌握（与首页 4 张统计卡重复）
    expect(bar, '顶栏仍有连续打卡').not.toContain('连续打卡');
    expect(bar, '顶栏仍有已掌握').not.toContain('已掌握');
    expect(bar, '顶栏丢失了等级').toContain('stat-level');
    expect(bar, '顶栏丢失了积分').toContain('stat-points');
  });
});

describe('桌面端导航项高度（P3-12）', () => {
  it('侧边栏分组标题高度不低于 40px', () => {
    const rule = (navCss.match(/\.nav-group-title\s*\{[\s\S]*?\}/) || [''])[0];
    expect(rule).toBeTruthy();
    const minH = rule.match(/min-height:\s*(\d+)px/);
    expect(minH, '缺少 min-height').toBeTruthy();
    expect(parseInt(minH[1], 10)).toBeGreaterThanOrEqual(40);
  });
});

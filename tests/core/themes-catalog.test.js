import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const items = readFileSync(join(root, 'js', 'items.js'), 'utf8');
const fxCss = readFileSync(join(root, 'css', 'theme-fx.css'), 'utf8');

// 8 款全新专属主题的结构契约：数据完整性 + 特效隔离 + 动效可关。

const EXPECTED = [
  ['aurora', 350], ['ember', 300], ['zen', 250], ['cyberpunk', 400],
  ['nordic', 275], ['vintage', 225], ['space', 375], ['candy', 200]
];

const VARS27 = ['ivory', 'ivoryWarm', 'ivoryDeep', 'ivoryCard', 'ivorySurface',
  'sage', 'sageDeep', 'sageMuted', 'sageLight', 'sageSurface', 'sageHover',
  'coral', 'coralDeep', 'coralHover', 'coralLight', 'coralSurface',
  'text', 'textSecondary', 'textTertiary', 'textGhost', 'textInverse',
  'border', 'borderLight', 'sidebarBg', 'sidebarText', 'sidebarActive', 'sidebarHover'];

function extractArray() {
  const start = items.indexOf('var THEMES = [');
  const end = items.indexOf('\n  ];', start);
  return items.slice(start, end);
}

describe('THEMES 目录结构', () => {
  const arr = extractArray();

  it('恰好 8 个主题，id 与定价符合规划（200-400）', () => {
    for (const [id, price] of EXPECTED) {
      expect(arr).toMatch(new RegExp("id: '" + id + "'"));
      expect(arr).toMatch(new RegExp('price: ' + price));
    }
    const ids = arr.match(/id: '(\w+)'/g) || [];
    expect(ids.length).toBe(8);
  });

  it('旧一代主题 ID 不得回流', () => {
    for (const old of ['ocean', 'sakura', 'lavender', 'forest', 'sunset', 'midnight', 'liquid', 'abyss', 'battle', 'lithos', 'boomerang']) {
      expect(items).not.toContain("id: '" + old + "'");
    }
  });

  it('每个主题 light/dark 各含 27 个变量', () => {
    for (const [id] of EXPECTED) {
      const tStart = arr.indexOf("id: '" + id + "'");
      const tEnd = arr.indexOf("id: '", tStart + 10) === -1 ? arr.length : arr.indexOf("id: '", tStart + 10);
      const block = arr.slice(tStart, tEnd);
      const lightIdx = block.indexOf('light: {');
      const darkIdx = block.indexOf('dark: {');
      const light = block.slice(lightIdx, darkIdx);
      const dark = block.slice(darkIdx);
      for (const v of VARS27) {
        expect(light, id + '.light.' + v).toContain(v + ':');
        expect(dark, id + '.dark.' + v).toContain(v + ':');
      }
    }
  });

  it('每款都有 desc 与 3 色 preview', () => {
    expect((arr.match(/desc: '/g) || []).length).toBe(8);
    expect((arr.match(/preview: \[/g) || []).length).toBe(8);
  });
});

describe('theme-fx.css 特效', () => {
  it('8 个主题各有独立隔离段，且每款 ≥3 个自有前缀 @keyframes（多层次场景）', () => {
    for (const [id] of EXPECTED) {
      expect(fxCss).toContain('[data-theme-id="' + id + '"]');
      const own = (fxCss.match(new RegExp('@keyframes ' + id + '-\\w+', 'g')) || []).length;
      expect(own, id + ' keyframes count').toBeGreaterThanOrEqual(3);
    }
  });

  it('keyframes 命名全部带主题前缀（跨主题零污染）', () => {
    const names = fxCss.match(/@keyframes ([\w-]+)/g) || [];
    for (const n of names) {
      const bare = n.replace('@keyframes ', '');
      expect(EXPECTED.some(([id]) => bare.indexOf(id + '-') === 0), bare + ' 未带主题前缀').toBe(true);
    }
  });

  it('每款主题必须改造整套界面表面（不只是背景）：卡片/按钮/输入框/选中色/滚动条/导航激活态 + dark 卡片', () => {
    for (const [id] of EXPECTED) {
      const sec = fxCss.slice(fxCss.indexOf('/* ---------- 0', fxCss.indexOf('· ' + id + ' ') === -1 ? 0 : fxCss.indexOf('· ' + id + ' ')));
      const own = fxCss.indexOf('[data-theme-id="' + id + '"] .word-card');
      expect(own, id + ' 卡片个性').toBeGreaterThan(-1);
      expect(fxCss.indexOf('[data-theme-id="' + id + '"] .btn-primary,'), id + ' 按钮个性').toBeGreaterThan(-1);
      expect(fxCss.indexOf('[data-theme-id="' + id + '"] input:focus'), id + ' 输入焦点').toBeGreaterThan(-1);
      expect(fxCss.indexOf('[data-theme-id="' + id + '"] ::selection'), id + ' 选中色').toBeGreaterThan(-1);
      expect(fxCss.indexOf('[data-theme-id="' + id + '"] ::-webkit-scrollbar-thumb'), id + ' 滚动条').toBeGreaterThan(-1);
      expect(fxCss.indexOf('[data-theme-id="' + id + '"] .nav-btn.active'), id + ' 导航激活态').toBeGreaterThan(-1);
      expect(fxCss.indexOf('[data-theme-id="' + id + '"][data-theme="dark"] .word-card'), id + ' dark 卡片').toBeGreaterThan(-1);
    }
  });

  it('dark 模式覆盖与 stats-bar/header/sidebar 触点齐备', () => {
    for (const [id] of EXPECTED) {
      expect(fxCss).toContain('[data-theme-id="' + id + '"][data-theme="dark"]');
      expect(fxCss).toMatch(new RegExp('\\[data-theme-id="' + id + '"\\] \\.app-header'));
      expect(fxCss).toMatch(new RegExp('\\[data-theme-id="' + id + '"\\] \\.sidebar'));
      expect(fxCss).toMatch(new RegExp('\\[data-theme-id="' + id + '"\\] \\.btn-primary'));
      expect(fxCss).toMatch(new RegExp('\\[data-theme-id="' + id + '"\\] \\.stats-bar span'));
    }
  });

  it('公共基础与 reduced-motion 保留，且动效可整体关闭', () => {
    expect(fxCss).toContain('[data-theme-id] .content');
    expect(fxCss).toContain('prefers-reduced-motion');
    const lastBlock = fxCss.slice(fxCss.lastIndexOf('prefers-reduced-motion'));
    expect(lastBlock).toContain('animation: none');
  });
});

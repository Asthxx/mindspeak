// measure-token-drift.mjs — 设计令牌漂移度量（UI 审查 P2-1 / P2-2 / P2-5）
//
// 为什么要有这个脚本：令牌收敛不是一次性的动作，而是一种"不允许再变差"的约束。
// 报告里给的数字（字号硬编码 339、间距脱轨 144、圆角 10 档）都是某一时刻的快照，
// 靠人记着没有意义。这里把它们变成可重复执行的测量，供 tests/core/design-tokens.test.js
// 直接引用做"上限断言"——新代码只能让这些数字变小，不能变大。
//
// 用法：node scripts/measure-token-drift.mjs
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const CSS_FILES = [
  'design-system', 'style', 'mobile', 'dashboard', 'ai-chat',
  'nav', 'items', 'theme-fx', 'android', 'wordlist', 'listening-fav',
].map(n => `css/${n}.css`).filter(f => existsSync(join(root, f)));

// 8pt 栅格：报告建议的完整序列
const GRID = [4, 8, 12, 16, 24, 32, 48, 64];
// 报告建议的 8 级字阶（px）
const TYPE_SCALE = [12, 13, 14, 16, 18, 20, 24, 30];
// 圆角令牌档位（px）
const RADIUS_SCALE = [4, 8, 12, 16, 20, 24];

export function measure() {
  const out = {
    fontSizeHard: 0,
    fontSizeTokens: 0,
    fontSizeValues: new Map(),
    spacingOffGrid: 0,
    spacingValues: new Map(),
    radiusOffScale: 0,
    radiusAliasUse: 0,
    hardHex: 0,
    hardHexValues: new Set(),
  };

  for (const rel of CSS_FILES) {
    // 先剥注释再统计：注释里写色值（说明"原 #E5E2DC → #E4E8EC"之类）是文档，
    // 不是硬编码颜色。初版没剥，导致"补文档"反而让指标变差。
    const s = readFileSync(join(root, rel), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');

    // ---- 字号 ----
    for (const m of s.matchAll(/font-size:\s*([0-9.]+)([a-z%]*)/g)) {
      out.fontSizeHard++;
      const v = m[1] + (m[2] || 'px');
      out.fontSizeValues.set(v, (out.fontSizeValues.get(v) || 0) + 1);
    }
    out.fontSizeTokens += (s.match(/font-size:\s*var\(--text-/g) || []).length;

    // ---- 间距（padding / margin / gap 上的裸 px）----
    for (const m of s.matchAll(/(?:^|[;{\s])(?:padding|margin|gap)(?:-(?:top|right|bottom|left|inline|block))?:\s*([^;}]+)/g)) {
      const nums = (m[1].match(/(?<![-\w.])([0-9]+)px/g) || []).map(x => parseInt(x, 10));
      for (const n of nums) {
        if (n === 0) continue;
        out.spacingValues.set(n, (out.spacingValues.get(n) || 0) + 1);
        if (!GRID.includes(n)) out.spacingOffGrid++;
      }
    }

    // ---- 圆角 ----
    for (const m of s.matchAll(/border-radius:\s*([^;}]+)/g)) {
      const nums = (m[1].match(/(?<![-\w.])([0-9]+)px/g) || []).map(x => parseInt(x, 10));
      for (const n of nums) {
        if (!RADIUS_SCALE.includes(n)) out.radiusOffScale++;
      }
    }
    out.radiusAliasUse += (s.match(/var\(--r-(?:sm|md|lg|xl|full|xs)\)/g) || []).length;

    // ---- 硬编码 hex ----
    for (const m of s.matchAll(/#[0-9A-Fa-f]{3,8}\b/g)) {
      out.hardHex++;
      out.hardHexValues.add(m[0].toLowerCase());
    }
  }

  out.hardHexUnique = out.hardHexValues.size;
  out.fontSizeUnique = out.fontSizeValues.size;
  return out;
}

// 直接运行时打印人读报告
if (process.argv[1] && process.argv[1].endsWith('measure-token-drift.mjs')) {
  const m = measure();
  const top = (map, n) => [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, n)
    .map(([k, v]) => `${k}×${v}`).join('  ');

  console.log('\n=== 设计令牌漂移度量 ===\n');
  console.log(`字号    硬编码 ${m.fontSizeHard} 处（去重 ${m.fontSizeUnique}）  |  var(--text-*) 引用 ${m.fontSizeTokens} 处`);
  console.log(`        高频值：${top(m.fontSizeValues, 12)}`);
  console.log(`间距    脱离 8pt 栅格 ${m.spacingOffGrid} 处  |  高频值：${top(m.spacingValues, 8)}`);
  console.log(`圆角    脱离档位 ${m.radiusOffScale} 处  |  var(--r-*) 别名用法 ${m.radiusAliasUse} 处`);
  console.log(`颜色    硬编码 hex ${m.hardHex} 处（去重 ${m.hardHexUnique}）`);
  console.log(`\n字阶目标：${TYPE_SCALE.join('/')}   栅格目标：${GRID.join('/')}   圆角目标：${RADIUS_SCALE.join('/')}\n`);
}

// apply-token-convergence.mjs — 令牌收敛的一次性批量转换（P2-1 / P2-3 / P2-5）
//
// 只做四类**纯等价或就近吸附**的替换，全部可回退（只改 CSS 文本）：
//   1. font-size 的裸 rem/px → 8 级字阶令牌（em/%/vw/calc 不碰：它们是上下文相关值，
//      换成固定 px 会改变继承行为）
//   2. var(--r-*) → var(--radius-*)，并删掉 style.css 里的等价别名
//   3. border-radius 的脱轨裸值 → 就近档位（999px 这类"胶囊"写法 → --radius-full）
//   4. padding/margin/gap 上的 6px → var(--sp-icon-gap)、2px → var(--sp-hairline)
//   5. sage 家族的手抄蓝 → 对应令牌
//
// 用法：node scripts/apply-token-convergence.mjs [--dry]
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const DRY = process.argv.includes('--dry');

const FILES = ['design-system', 'style', 'mobile', 'dashboard', 'ai-chat',
  'nav', 'items', 'theme-fx', 'android', 'wordlist', 'listening-fav']
  .map(n => join(root, 'css', n + '.css')).filter(existsSync);

// 字阶：px → 令牌
const TYPE = [[12, 'xs'], [13, '2xs'], [14, 'sm'], [16, 'base'], [18, 'lg'], [20, 'xl'], [24, '2xl'], [30, '3xl'], [36, '4xl']];
// 圆角档位
const RADIUS = [4, 8, 12, 16, 20, 24];
// 手抄蓝 → 令牌
const BLUE = {
  '#4a6f93': 'var(--sage-hover)',   // 同 --sage 稍深，用于 hover 态
  '#3e5f7f': 'var(--sage-deep)',
  '#5e8fb8': 'var(--sage-muted)',
  '#3a63b8': 'var(--sage-deep)',
  '#2563eb': 'var(--sage)',
  '#9fc5e4': 'var(--sage-light)',
  '#e4ebf7': 'var(--sage-surface)',
};

function toPx(num, unit) {
  const n = parseFloat(num);
  if (unit === 'rem' || unit === '') return n * 16;
  return n;                       // px
}
function nearestType(px) {
  let best = TYPE[0];
  for (const t of TYPE) if (Math.abs(t[0] - px) < Math.abs(best[0] - px)) best = t;
  return best;
}
function nearestRadius(px) {
  let best = RADIUS[0];
  for (const r of RADIUS) if (Math.abs(r - px) < Math.abs(best - px)) best = r;
  return best;
}

const stats = { font: 0, radiusAlias: 0, radiusValue: 0, spacing: 0, blue: 0 };

for (const f of FILES) {
  let s = readFileSync(f, 'utf8');
  const before = s;

  // ---------- 1. font-size ----------
  // 只处理 rem / px；em % vw vh calc inherit 等一律跳过
  s = s.replace(/font-size:\s*([0-9.]+)(rem|px)\b/g, (m, num, unit) => {
    const px = toPx(num, unit);
    // 超过 4xl(36px) 的展示级字号不吸附 —— 那是排版意图，不是漂移
    if (px > 40) return m;
    const [target, name] = nearestType(px);
    if (Math.abs(target - px) > 4) return m;       // 差太多说明是有意的值，不动
    stats.font++;
    return `font-size: var(--text-${name})`;
  });

  // ---------- 2. var(--r-*) → var(--radius-*) ----------
  s = s.replace(/var\(--r-(xs|sm|md|lg|xl|2xl|full)\)/g, (m, n) => {
    stats.radiusAlias++;
    return `var(--radius-${n})`;
  });

  // ---------- 3. border-radius 脱轨值 ----------
  s = s.replace(/border-radius:\s*([^;}]+)/g, (m, val) => {
    if (/var\(/.test(val)) return m;               // 已是令牌
    let changed = false;
    const out = val.replace(/(?<![-\w.])([0-9]+)px/g, (x, n) => {
      const px = parseInt(n, 10);
      if (px >= 100) { changed = true; stats.radiusValue++; return 'var(--radius-full)'; }
      if (RADIUS.includes(px)) return x;
      changed = true; stats.radiusValue++;
      return `var(--radius-${{ 4: 'xs', 8: 'sm', 12: 'md', 16: 'lg', 20: 'xl', 24: '2xl' }[nearestRadius(px)]})`;
    });
    return changed ? `border-radius:${out.startsWith(' ') ? out : out}` : m;
  });

  // ---------- 4. 间距例外令牌化 ----------
  s = s.replace(/(?<=^|[;{\s])(padding|margin|gap)(?:-(?:top|right|bottom|left|inline|block))?:\s*([^;}]+)/g, (m, prop, val) => {
    // 只替换整值就是 6px / 2px 的声明（多值简写里混了别的值就不动，避免误判）
    const t = val.trim();
    if (t === '6px') { stats.spacing++; return m.replace('6px', 'var(--sp-icon-gap)'); }
    if (t === '2px') { stats.spacing++; return m.replace('2px', 'var(--sp-hairline)'); }
    return m;
  });

  // ---------- 5. 手抄蓝 ----------
  // ⚠️ 必须逐行判断，跳过"令牌定义行"。
  // 首次执行时对整段文本做 replace，把 `--sage-deep: #3E5F7F;` 也换成了
  // `--sage-deep: var(--sage-deep);` —— CSS 变量自引用是无效声明且不报错，
  // 结果是 --sage-deep / --sage-hover / --sage-muted 三个令牌整体失效，
  // 主按钮渐变被冲淡、全站低对比项从 0 飙到 248。排查见 scripts/check-token-selfref.mjs。
  const isTokenDef = (line) => /^\s*--[a-z0-9-]+\s*:/.test(line);
  s = s.split(/(\r?\n)/).map(chunk => {
    if (isTokenDef(chunk)) return chunk;          // 令牌定义行原样保留
    let out = chunk;
    for (const [hex, token] of Object.entries(BLUE)) {
      const re = new RegExp(hex, 'gi');
      if (re.test(out)) { out = out.replace(re, () => { stats.blue++; return token; }); }
    }
    return out;
  }).join('');

  if (s !== before && !DRY) writeFileSync(f, s);
}

// 删掉 style.css 里的 --r-* 等价别名
const stylePath = join(root, 'css', 'style.css');
if (existsSync(stylePath)) {
  let s = readFileSync(stylePath, 'utf8');
  const next = s.replace(/\n\s*--r-(?:xs|sm|md|lg|xl|2xl|full):\s*var\(--radius-[a-z0-9]+\);/g, '');
  if (next !== s && !DRY) writeFileSync(stylePath, next);
}

console.log(`\n=== 令牌收敛批量转换${DRY ? '（dry-run，未写盘）' : ''} ===\n`);
console.log(`  font-size → 字阶令牌        ${stats.font} 处`);
console.log(`  var(--r-*) → var(--radius-*) ${stats.radiusAlias} 处`);
console.log(`  border-radius 脱轨值吸附     ${stats.radiusValue} 处`);
console.log(`  6px/2px → 显式例外令牌       ${stats.spacing} 处`);
console.log(`  手抄蓝 → sage 家族令牌       ${stats.blue} 处`);
console.log('');

// check-theme-contrast.mjs — 核算主题商店各色包三级文本对比度（WCAG AA 4.5:1），
// 并对不达标项按「保持原色相与饱和度、只调明度」求解达标替代色。
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const FILE = join(root, 'js', 'items.js');
const src = readFileSync(FILE, 'utf8');

const srgb = v => v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
const lum = h => {
  const m = h.replace('#', '').match(/../g).map(x => parseInt(x, 16) / 255).map(srgb);
  return 0.2126 * m[0] + 0.7152 * m[1] + 0.0722 * m[2];
};
const ratio = (a, b) => {
  const l1 = lum(a), l2 = lum(b);
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
};
const grab = (blk, k) => {
  const m = blk.match(new RegExp(k + ":\\s*'(#[0-9A-Fa-f]{6})'"));
  return m ? m[1] : null;
};

// ---- HSL <-> HEX ----
function hexToHsl(hex) {
  const [r, g, b] = hex.replace('#', '').match(/../g).map(x => parseInt(x, 16) / 255);
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn;
  let h = 0;
  if (d) {
    if (mx === r) h = ((g - b) / d) % 6;
    else if (mx === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60; if (h < 0) h += 360;
  }
  const l = (mx + mn) / 2;
  const s = d ? d / (1 - Math.abs(2 * l - 1)) : 0;
  return [h, s, l];
}
function hslToHex(h, s, l) {
  const c = (1 - Math.abs(2 * l - 1)) * s, x = c * (1 - Math.abs((h / 60) % 2 - 1)), m = l - c / 2;
  const seg = [[c, x, 0], [x, c, 0], [0, c, x], [0, x, c], [x, 0, c], [c, 0, x]][Math.floor(h / 60) % 6];
  return '#' + seg.map(v => Math.round((v + m) * 255).toString(16).padStart(2, '0')).join('').toUpperCase();
}

// 求解：保持 H/S，只调 L，使在最深的相关背景上对比度 >= 4.6（留余量）
function solve(fg, bgs) {
  const [h, s] = hexToHsl(fg);
  const goDarker = lum(bgs[0]) > 0.5;          // 浅底 → 压暗；深底 → 提亮
  let best = null;
  for (let i = 0; i <= 100; i++) {
    const l = goDarker ? (hexToHsl(fg)[2] - i / 100) : (hexToHsl(fg)[2] + i / 100);
    if (l < 0.02 || l > 0.98) break;
    const cand = hslToHex(h, s, l);
    if (bgs.every(bg => ratio(cand, bg) >= 4.6)) { best = cand; break; }
  }
  return best;
}

const blocks = [...src.matchAll(/light:\s*\{([\s\S]*?)\},\s*\n\s*dark:\s*\{([\s\S]*?)\n\s{6}\}/g)];
const names = [...src.matchAll(/id:\s*'([a-z]+)', name: '([^']+)'/g)].map(m => m[2]);

const fixes = [];   // {theme, tag, old, next}
let bad = 0, total = 0;

blocks.forEach((b, i) => {
  const nm = names[i] || ('#' + i);
  [['浅色', b[1]], ['深色', b[2]]].forEach(([tag, blk]) => {
    const t = grab(blk, 'textTertiary');
    const card = grab(blk, 'ivoryCard'), ivory = grab(blk, 'ivory'), warm = grab(blk, 'ivoryWarm'), surf = grab(blk, 'ivorySurface');
    if (!t || !card || !ivory) return;
    total++;
    const bgs = [card, ivory, warm, surf].filter(Boolean);
    const worst = Math.min(...bgs.map(bg => ratio(t, bg)));
    if (worst >= 4.5) return;
    bad++;
    const next = solve(t, bgs);
    console.log(`✗ ${nm}/${tag}  ${t} → ${next || '无解'}   最差 ${worst.toFixed(2)}:1${next ? ' → ' + Math.min(...bgs.map(bg => ratio(next, bg))).toFixed(2) + ':1' : ''}`);
    if (next) fixes.push({ old: t, next, theme: nm, tag });
  });
});

console.log(`\n共 ${total} 组色包，不达标 ${bad} 组，可自动修正 ${fixes.length} 组。`);

// ---- 应用修正（仅在显式 --apply 时）----
if (process.argv.includes('--apply')) {
  let out = src;
  let applied = 0;
  // 逐个替换：同一色值可能在多处出现，按 (theme,tag) 定位不可靠，改为按值精确替换 + 计数校验
  for (const f of fixes) {
    const re = new RegExp("(textTertiary:\\s*')" + f.old + "(')", 'g');
    const n = (out.match(re) || []).length;
    if (n !== 1) { console.log(`  跳过 ${f.theme}/${f.tag} ${f.old}（出现 ${n} 次，需人工确认）`); continue; }
    out = out.replace(re, '$1' + f.next + '$2');
    applied++;
  }
  writeFileSync(FILE, out, 'utf8');
  console.log(`已写入 ${FILE}，修正 ${applied} 处。`);
}

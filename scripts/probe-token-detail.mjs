// 一次性细分统计：圆角档位分布 + sage 家族蓝色变体分布（配合 P2-3 / P2-5 决策）
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const files = ['design-system', 'style', 'mobile', 'dashboard', 'ai-chat',
  'nav', 'items', 'theme-fx', 'android', 'wordlist', 'listening-fav']
  .map(n => join(root, 'css', n + '.css')).filter(existsSync);

const rad = new Map(), blue = new Map();
const blues = ['#4a6f93', '#5b82a6', '#5e8fb8', '#3a63b8', '#3e5f7f', '#9fc5e4', '#2563eb', '#e4ebf7'];

for (const f of files) {
  const s = readFileSync(f, 'utf8');
  for (const m of s.matchAll(/border-radius:\s*([^;}]+)/g)) {
    for (const x of (m[1].match(/(?<![-\w.])([0-9]+)px/g) || [])) {
      const n = parseInt(x, 10);
      rad.set(n, (rad.get(n) || 0) + 1);
    }
  }
  const low = s.toLowerCase();
  for (const b of blues) {
    let c = 0, i = 0;
    while ((i = low.indexOf(b, i)) !== -1) { c++; i += b.length; }
    if (c) blue.set(b, (blue.get(b) || 0) + c);
  }
}

const fmt = m => [...m.entries()].sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k}×${v}`).join('  ');
console.log('圆角分布：', fmt(rad));
console.log('蓝色变体：', fmt(blue));
